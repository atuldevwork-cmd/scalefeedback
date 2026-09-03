import { load } from 'cheerio';

export const BOT_UA = 'Mozilla/5.0 (compatible; PinmarksBot/1.0; +https://pinmarks.com)';

// No serverless maxDuration here — this runs as a long-lived worker process,
// so these are generous sanity caps (protect against a pathological/infinite
// site), not a tight budget like the old in-request version in
// apps/dashboard/lib/monitor.ts had to use.
const CRAWL_MAX_PAGES = 3_000;
const MAX_LINKS_TO_CHECK = 6_000;
// Modest — crawling AND checking both repeatedly hit the same target origin,
// and a real site-wide sweep (thousands of requests, no time limit) makes it
// easy to trip a site's own rate limiting if we don't pace ourselves. The
// HostGate below is the real safety net; this just keeps the baseline polite.
const CRAWL_CONCURRENCY = 3;
const CHECK_CONCURRENCY = 4;
const PAGE_TIMEOUT_MS = 8_000;
// 6s was too tight for real-world sites behind a slow WAF/challenge (Akamai,
// Cloudflare, etc.) — plenty of genuinely-up pages (facebook.com,
// tpb.gov.au, servicesaustralia.gov.au...) took longer than that to answer a
// bot HEAD/GET, and a timeout here used to be reported as a broken link
// (see the AbortError handling in checkLinkStatus below, which now treats
// it as inconclusive instead).
const LINK_CHECK_TIMEOUT_MS = 15_000;
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 15_000;
const MAX_RATE_LIMIT_BACKOFF_MS = 5 * 60_000;
// Proactive spacing between any two requests to the SAME host, independent
// of concurrency — real crawlers pace themselves rather than bursting up to
// the concurrency limit and reacting only after a site's rate limiter fires.
// Reactive backoff (below) alone wasn't enough: at concurrency 3 we still
// burst 3 near-simultaneous requests per host repeatedly, which is exactly
// the pattern most rate limiters key on.
const MIN_REQUEST_INTERVAL_PER_HOST_MS = 400;

// Share/intent action URLs aren't content pages — several (notably Twitter/X
// and Facebook) reject HEAD outright or bot-block entirely, which reads as
// "broken" even though the link works fine for a real visitor.
const SHARE_INTENT_PATTERN = /(?:twitter|x)\.com\/intent\/|facebook\.com\/(?:sharer|share\.php)|linkedin\.com\/(?:share|sharing)|api\.whatsapp\.com\/send|pinterest\.com\/pin\/create/i;

// Marketing tracking/redirect endpoints (HubSpot CTA click-tracking and its
// custom-domain redirect proxy) aren't content pages either — they're meant
// to be followed by a real browser session, and bot-block or hang for a
// plain HEAD/GET, which otherwise reads as a broken link even though the
// destination they point to works fine.
const TRACKING_REDIRECT_PATTERN = /\/hs\/cta\/wi\/redirect(?:\?|$)|cta-service-cms\d*\.hubspot\.com\/web-interactives\/public\/v1\/track\/click/i;

export interface BrokenLinkResult {
  href: string;
  text: string;
  isExternal: boolean;
  foundOnPages: string[];
  detail: string;
}

export interface CrawlProgress {
  pagesCrawled: number;
  linksChecked: number;
}

interface DiscoveredLink { href: string; text: string; isExternal: boolean; foundOn: Set<string> }

function parseRetryAfterMs(resp: Response): number {
  const header = resp.headers.get('retry-after');
  if (!header) return DEFAULT_RATE_LIMIT_BACKOFF_MS;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return Math.max(seconds, 1) * 1_000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(date - Date.now(), 1_000);
  return DEFAULT_RATE_LIMIT_BACKOFF_MS;
}

// Per-host pacing + circuit breaker. A 429 means "you're going too fast", not
// "this page/link is dead" — without this, aggressive crawling (thousands of
// requests, no time limit) reliably trips a site's own rate limiting partway
// through and every request after that point reads as a false "broken link".
//
// Two layers: `reserveSlot` proactively spaces out every request to a host
// (so we mostly never trigger a 429 in the first place — this is the main
// fix), and `reportRateLimited`/`waitIfCoolingDown` react to one if it still
// happens, backing off exponentially per host so a persistently strict site
// doesn't just get hit again every `DEFAULT_RATE_LIMIT_BACKOFF_MS`.
class HostGate {
  private cooldownUntil = new Map<string, number>();
  private consecutive429 = new Map<string, number>();
  private nextSlotAt = new Map<string, number>();

  async waitIfCoolingDown(host: string): Promise<void> {
    const until = this.cooldownUntil.get(host);
    if (until && until > Date.now()) {
      await new Promise((r) => setTimeout(r, until - Date.now()));
    }
  }

  // Claims the next available request slot for this host and waits for it —
  // guarantees at least MIN_REQUEST_INTERVAL_PER_HOST_MS between any two
  // requests to the same host, no matter how many callers race in concurrently.
  async reserveSlot(host: string): Promise<void> {
    await this.waitIfCoolingDown(host);
    const now = Date.now();
    const earliestSlot = this.nextSlotAt.get(host) ?? now;
    const slot = Math.max(now, earliestSlot);
    this.nextSlotAt.set(host, slot + MIN_REQUEST_INTERVAL_PER_HOST_MS);
    if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
  }

  reportRateLimited(host: string, retryAfterMs: number): void {
    const streak = (this.consecutive429.get(host) ?? 0) + 1;
    this.consecutive429.set(host, streak);
    const backoffMs = Math.min(Math.max(retryAfterMs, DEFAULT_RATE_LIMIT_BACKOFF_MS * 2 ** (streak - 1)), MAX_RATE_LIMIT_BACKOFF_MS);
    const until = Date.now() + backoffMs;
    const existing = this.cooldownUntil.get(host);
    if (!existing || until > existing) this.cooldownUntil.set(host, until);
    console.error(`[crawler] 429 from ${host} (#${streak} in a row) — cooling down ${(backoffMs / 1000).toFixed(1)}s`);
  }

  reportSuccess(host: string): void {
    this.consecutive429.set(host, 0);
  }
}

async function fetchWithMethod(href: string, method: 'HEAD' | 'GET', signal: AbortSignal) {
  return fetch(href, { method, redirect: 'follow', signal, headers: { 'User-Agent': BOT_UA } });
}

// `inconclusive: true` means "we could not get a real answer" (persistent
// rate-limiting) — callers must NOT treat this as broken, only as unchecked.
async function checkLinkStatus(href: string, gate: HostGate): Promise<{ ok: boolean; inconclusive: boolean; detail: string }> {
  const host = new URL(href).host;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LINK_CHECK_TIMEOUT_MS);
  try {
    await gate.reserveSlot(host);
    let resp: Response;
    try {
      resp = await fetchWithMethod(href, 'HEAD', controller.signal);
    } catch (headErr) {
      // Some CDNs/edges (notably HubSpot CTA tracking redirects) drop or
      // reset HEAD requests outright instead of responding with a status,
      // which otherwise surfaces as a false "Request failed". A GET retry
      // is the real signal here — same principle as the 4xx-on-HEAD case
      // below, just at the network-error layer instead of the HTTP layer.
      // Don't retry on our own timeout firing — we're already out of time.
      if (controller.signal.aborted) throw headErr;
      await gate.reserveSlot(host);
      resp = await fetchWithMethod(href, 'GET', controller.signal);
    }

    if (resp.status === 429) {
      gate.reportRateLimited(host, parseRetryAfterMs(resp));
      await gate.reserveSlot(host);
      resp = await fetchWithMethod(href, 'GET', controller.signal);
      if (resp.status === 429) {
        gate.reportRateLimited(host, parseRetryAfterMs(resp));
        return { ok: false, inconclusive: true, detail: 'Rate limited — could not verify' };
      }
    } else if (resp.status >= 400) {
      // Some servers reject HEAD specifically (405/501) or block it outright
      // (403/404 on HEAD while GET works fine) — a GET retry is the real signal.
      resp = await fetchWithMethod(href, 'GET', controller.signal);
    }

    gate.reportSuccess(host);
    if (resp.status === 401 || resp.status === 403) {
      // WAFs (Akamai, Cloudflare, etc.) commonly 401/403 any request carrying
      // a self-identifying bot User-Agent, regardless of whether the link is
      // actually dead for a real visitor — ato.gov.au does this. We have no
      // way to tell "genuinely gone" apart from "bot-blocked" here, so don't
      // report a false broken link, just leave it unverified.
      return { ok: false, inconclusive: true, detail: `HTTP ${resp.status} — likely bot-blocked, verify manually` };
    }
    if (resp.status >= 400) return { ok: false, inconclusive: false, detail: `HTTP ${resp.status}` };
    return { ok: true, inconclusive: false, detail: '' };
  } catch (err) {
    // Our own timeout firing (AbortError, or the signal already flagged
    // aborted when the HEAD-retry-as-GET path rethrows it) means we never
    // got a real answer — that's "could not verify", not "broken". Treating
    // it as broken was the main source of false positives: plenty of
    // genuinely-up sites (facebook.com, tpb.gov.au, servicesaustralia.gov.au)
    // just take longer than our timeout to answer a bot request.
    if (controller.signal.aborted) {
      return { ok: false, inconclusive: true, detail: `Timed out after ${LINK_CHECK_TIMEOUT_MS / 1000}s — could not verify` };
    }
    return { ok: false, inconclusive: false, detail: err instanceof Error ? err.message : 'Request failed' };
  } finally {
    clearTimeout(timer);
  }
}

async function seedFromSitemap(startUrl: string): Promise<string[]> {
  try {
    const origin = new URL(startUrl).origin;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    const resp = await fetch(`${origin}/sitemap.xml`, { headers: { 'User-Agent': BOT_UA }, signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) return [];
    const text = await resp.text();
    const urls: string[] = [];
    for (const m of text.matchAll(/<loc>(.*?)<\/loc>/g)) {
      const u = m[1].trim();
      if (!u.endsWith('.xml')) urls.push(u);
    }
    return urls;
  } catch {
    return [];
  }
}

// Given everything known so far about a link, returns its status if resolved
// (a real HTTP answer, or a completed external check), or undefined if we
// haven't reached it yet — shared by the incremental live-batch reporting
// below and the final full pass so both agree on what "broken" means.
function resolveLink(
  link: DiscoveredLink,
  pageStatus: Map<string, number>,
  checkResults: Map<string, { ok: boolean; inconclusive: boolean; detail: string }>
): { ok: boolean; inconclusive: boolean; detail: string } | undefined {
  if (link.isExternal) return checkResults.get(link.href);
  const known = pageStatus.get(link.href);
  if (known === undefined || known === -1) return undefined;
  const ok = known > 0 && known < 400;
  const inconclusive = known === 401 || known === 403;
  const detail = inconclusive ? `HTTP ${known} — likely bot-blocked, verify manually` : known === 0 ? 'Request failed' : `HTTP ${known}`;
  return { ok, inconclusive, detail };
}

export async function crawlForBrokenLinks(
  startUrl: string,
  // The monitor's configured "Max pages" — capped against CRAWL_MAX_PAGES
  // (the hard sanity ceiling) the same way pagespeed.ts's
  // discoverInternalPages caps it, so a small max_pages setting is actually
  // honored here instead of always crawling up to the 3,000-page ceiling.
  maxPages: number,
  onProgress: (progress: CrawlProgress) => Promise<void> | void,
  // Fired periodically (same cadence as onProgress) with links that have
  // just been confirmed broken since the last call — lets callers persist
  // findings while the crawl is still running instead of only at the end,
  // so the UI can show issues turant (as they're found) rather than waiting
  // for the whole site to finish crawling.
  onBatch?: (results: BrokenLinkResult[]) => Promise<void> | void,
  // Checked on the same cadence as onProgress — lets a caller stop a scan
  // that's already running (a user hit "Stop scan") without killing the
  // whole worker process. Findings already discovered (and already handed
  // to onBatch) are kept; the crawl just stops discovering more.
  isCancelled?: () => Promise<boolean> | boolean
): Promise<{ results: BrokenLinkResult[]; cancelled: boolean }> {
  const base = new URL(startUrl);
  const gate = new HostGate();
  const effectiveMaxPages = Math.min(Math.max(1, maxPages), CRAWL_MAX_PAGES);

  const visited = new Set<string>();
  const queued = new Set<string>([startUrl]);
  const queue: string[] = [startUrl];
  for (const u of await seedFromSitemap(startUrl)) {
    if (!queued.has(u)) { queued.add(u); queue.push(u); }
  }

  // 0 = request failed entirely, -1 = rate-limited (inconclusive, not a real status)
  const pageStatus = new Map<string, number>();
  const linksByHref = new Map<string, DiscoveredLink>();

  // External links are checked live as soon as they're discovered, running
  // concurrently with the ongoing crawl — instead of crawling the whole site
  // first and only then bulk-checking links afterward. Internal links don't
  // need a separate check queue: we're already crawling them as pages, and
  // pageStatus captures their real status the moment that fetch resolves.
  // This makes "pages crawled" and "links checked" advance together, the way
  // reference tools like brokenlinkcheck.com report progress per page rather
  // than in two big sequential phases.
  const checkQueue: string[] = [];
  const checkQueued = new Set<string>();
  const checkResults = new Map<string, { ok: boolean; inconclusive: boolean; detail: string }>();
  let linksChecked = 0;
  let crawlingDone = false;
  let cancelled = false;

  function enqueueExternalCheck(href: string) {
    if (checkQueued.has(href) || checkQueued.size >= MAX_LINKS_TO_CHECK) return;
    checkQueued.add(href);
    checkQueue.push(href);
  }

  const reportedHrefs = new Set<string>();
  async function emitNewlyResolvedBatch() {
    if (!onBatch) return;
    const batch: BrokenLinkResult[] = [];
    for (const link of linksByHref.values()) {
      if (reportedHrefs.has(link.href)) continue;
      const resolved = resolveLink(link, pageStatus, checkResults);
      if (!resolved) continue; // not answered yet — check again next time
      reportedHrefs.add(link.href);
      if (resolved.ok || resolved.inconclusive) continue;
      batch.push({ href: link.href, text: link.text, isExternal: link.isExternal, foundOnPages: [...link.foundOn], detail: resolved.detail });
    }
    if (batch.length > 0) await onBatch(batch);
  }

  let lastReported = 0;
  async function reportProgressIfDue(force = false) {
    const progressTotal = visited.size + linksChecked;
    if (force || progressTotal - lastReported >= 10) {
      lastReported = progressTotal;
      await onProgress({ pagesCrawled: visited.size, linksChecked });
      await emitNewlyResolvedBatch();
      if (!cancelled && isCancelled) cancelled = await isCancelled();
    }
  }

  async function crawlWorker() {
    while (queue.length > 0 && visited.size < effectiveMaxPages && !cancelled) {
      const url = queue.shift();
      if (!url || visited.has(url)) continue;
      visited.add(url);

      const host = new URL(url).host;
      await gate.reserveSlot(host);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
      try {
        const resp = await fetch(url, { headers: { 'User-Agent': BOT_UA }, redirect: 'follow', signal: controller.signal });
        if (resp.status === 429) {
          gate.reportRateLimited(host, parseRetryAfterMs(resp));
          pageStatus.set(url, -1);
          continue;
        }
        gate.reportSuccess(host);
        pageStatus.set(url, resp.status);
        if (resp.status >= 400) continue; // don't parse a dead page for more links to follow
        const contentType = resp.headers.get('content-type') ?? '';
        if (!contentType.includes('html')) continue;
        const html = await resp.text();
        const $ = load(html);
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href') ?? '';
          const text = $(el).text().trim().slice(0, 100);
          try {
            const resolved = new URL(href, url);
            resolved.hash = ''; // #fragment is client-side only — same resource either way
            const normalized = resolved.href;
            if (!/^https?:\/\//i.test(normalized)) return; // skip mailto:, tel:, javascript:
            if (SHARE_INTENT_PATTERN.test(normalized) || TRACKING_REDIRECT_PATTERN.test(normalized)) return; // action/tracking URL, not content
            const isExternal = resolved.origin !== base.origin;
            const existing = linksByHref.get(normalized);
            if (existing) existing.foundOn.add(url);
            else linksByHref.set(normalized, { href: normalized, text, isExternal, foundOn: new Set([url]) });
            if (!isExternal) {
              if (!visited.has(normalized) && !queued.has(normalized)) {
                queued.add(normalized);
                queue.push(normalized);
              }
            } else if (!existing) {
              enqueueExternalCheck(normalized); // first time we've seen this external link — start checking it now
            }
          } catch { /* malformed href — skip */ }
        });
      } catch {
        // Same reasoning as checkLinkStatus's AbortError handling above: our
        // own timeout firing isn't proof the page is actually down, just
        // that it didn't answer in time — reuse the -1 "inconclusive"
        // sentinel (already excluded from results by resolveLink) instead of
        // 0 ("real fetch failure"), so a slow-but-live internal page doesn't
        // get reported as a broken link.
        pageStatus.set(url, controller.signal.aborted ? -1 : 0);
      } finally {
        clearTimeout(timer);
      }
      await reportProgressIfDue();
    }
  }

  async function checkWorker() {
    for (;;) {
      if (cancelled) return;
      const href = checkQueue.shift();
      if (!href) {
        if (crawlingDone) return; // no more links coming and nothing left to check
        await new Promise((r) => setTimeout(r, 150)); // wait for the crawl to discover more
        continue;
      }
      checkResults.set(href, await checkLinkStatus(href, gate));
      linksChecked++;
      await reportProgressIfDue();
    }
  }

  await Promise.all([
    (async () => {
      await Promise.all(Array.from({ length: CRAWL_CONCURRENCY }, crawlWorker));
      crawlingDone = true;
    })(),
    ...Array.from({ length: CHECK_CONCURRENCY }, checkWorker),
  ]);
  await reportProgressIfDue(true);

  const results: BrokenLinkResult[] = [];
  for (const link of linksByHref.values()) {
    // A known status is only trustworthy if it's a real answer — -1
    // (rate-limited during crawl), missing (capped out before we reached it),
    // or an unfinished external check all mean we never got a real answer.
    const resolved = resolveLink(link, pageStatus, checkResults);
    if (!resolved) continue;
    if (resolved.ok || resolved.inconclusive) continue; // inconclusive (persistent rate-limit or bot-block) — don't report as broken
    results.push({
      href: link.href,
      text: link.text,
      isExternal: link.isExternal,
      foundOnPages: [...link.foundOn],
      detail: resolved.detail,
    });
  }
  return { results, cancelled };
}
