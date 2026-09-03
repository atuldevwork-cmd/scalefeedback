import { load } from 'cheerio';
import { BOT_UA } from './crawler.js';

// Google's own guidance: unauthenticated calls to this endpoint work but are
// heavily rate-limited (intended for occasional/manual use) — a free key
// from Google Cloud Console (API & Services → PageSpeed Insights API) lifts
// that to 25,000/day. We run fine without one for light/occasional use;
// PAGESPEED_API_KEY in apps/worker/.env.local upgrades it.
const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const PSI_TIMEOUT_MS = 30_000;
// PSI itself takes ~5-15s per URL (it runs a real Lighthouse audit
// server-side), and we now run mobile + desktop concurrently per page — this
// is the number the dashboard shows the user before they click "Run", scaled
// by page count, so nobody's left guessing how long a multi-page check will
// take.
export const AVG_SECONDS_PER_PAGE = 12;
const CHECK_CONCURRENCY = 3;
const DISCOVER_MAX_PAGES_CAP = 3_000; // sanity cap, mirrors crawler.ts's CRAWL_MAX_PAGES
const PAGE_TIMEOUT_MS = 8_000;
const MAX_OPPORTUNITIES = 5;
const MAX_OPPORTUNITY_ITEMS = 5;

export interface PageSpeedOpportunityItem {
  url?: string;
  wastedBytes?: number;
  wastedMs?: number;
  totalBytes?: number;
}

export interface PageSpeedOpportunity {
  title: string;
  savingsMs?: number;
  savingsBytes?: number;
  // Per-resource breakdown (which JS/CSS file, how much of it is wasted) —
  // only present for 'diagnostics' audits, whose details carry an `items`
  // array; 'insights' audits (metricSavings-based) have no such breakdown.
  items?: PageSpeedOpportunityItem[];
}

export interface StrategyResult {
  score: number; // 0-100, Lighthouse performance category score
  lcp?: string;
  cls?: string;
  tbt?: string;
  fcp?: string;
  speedIndex?: string;
  opportunities: PageSpeedOpportunity[]; // top items by estimated impact, only scoped to Performance
}

export interface PageSpeedResult {
  url: string;
  mobile: StrategyResult;
  desktop: StrategyResult;
}

interface LighthouseAudit {
  title?: string;
  score?: number | null;
  displayValue?: string;
  // Older-style audits (still present, grouped 'diagnostics') carry a
  // concrete byte/time estimate here, plus a per-resource breakdown in
  // `items` (which specific JS/CSS file, how much of it is wasted).
  details?: { overallSavingsMs?: number; overallSavingsBytes?: number; items?: LighthouseAuditItem[] };
  // Newer "Insights" audits (grouped 'insights', replacing the old
  // Opportunities/Diagnostics split in current Lighthouse) carry per-metric
  // improvement estimates here instead — e.g. { LCP: 4800, FCP: 150 } (ms).
  metricSavings?: Record<string, number>;
}

interface LighthouseAuditItem {
  url?: string;
  wastedBytes?: number;
  wastedMs?: number;
  totalBytes?: number;
}

interface LighthouseResult {
  categories?: { performance?: { score?: number; auditRefs?: { id: string; group?: string }[] } };
  audits?: Record<string, LighthouseAudit | undefined>;
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

// A lean same-origin BFS crawl — just enough to build the page list Page
// Speed checks run against. Unlike crawler.ts's crawlForBrokenLinks, this
// doesn't check external links or classify anything as broken, so it skips
// all of that machinery (HostGate pacing/backoff, link-status resolution).
export async function discoverInternalPages(startUrl: string, maxPages: number): Promise<string[]> {
  const base = new URL(startUrl);
  const visited = new Set<string>();
  const queued = new Set<string>([startUrl]);
  const queue: string[] = [startUrl];
  for (const u of await seedFromSitemap(startUrl)) {
    if (!queued.has(u) && queued.size < maxPages) { queued.add(u); queue.push(u); }
  }

  const cap = Math.min(maxPages, DISCOVER_MAX_PAGES_CAP);
  while (queue.length > 0 && visited.size < cap) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;
    visited.add(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
    try {
      const resp = await fetch(url, { headers: { 'User-Agent': BOT_UA }, redirect: 'follow', signal: controller.signal });
      const contentType = resp.headers.get('content-type') ?? '';
      if (resp.status >= 400 || !contentType.includes('html')) continue;
      const html = await resp.text();
      const $ = load(html);
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        try {
          const resolved = new URL(href, url);
          resolved.hash = '';
          const normalized = resolved.href;
          if (!/^https?:\/\//i.test(normalized)) return;
          if (resolved.origin !== base.origin) return;
          if (!visited.has(normalized) && !queued.has(normalized) && queued.size < cap) {
            queued.add(normalized);
            queue.push(normalized);
          }
        } catch { /* malformed href — skip */ }
      });
    } catch {
      // Couldn't fetch this page for discovery — just skip it, not fatal to
      // the overall page list the way it would be for a broken-link report.
    } finally {
      clearTimeout(timer);
    }
  }
  return [...visited].slice(0, maxPages);
}

// Pulls the "what to fix" list Lighthouse itself surfaces (the same audits
// PSI's own UI shows under Insights/Opportunities) — auditRefs tagged
// 'load-opportunities' are the ones with a quantified savings estimate,
// which is what makes them actionable rather than just informational.
// Top resources by wasted bytes/ms — capped so a page with dozens of
// flagged files (unused JS, unoptimized images, ...) doesn't bloat the
// stored issue. Both 'diagnostics' and 'insights' audits use this same
// details.items table shape for their per-resource breakdown.
function extractAuditItems(audit: LighthouseAudit): PageSpeedOpportunityItem[] | undefined {
  const auditItems = (audit.details?.items ?? [])
    .filter((it) => it.url)
    .sort((a, b) => (b.wastedBytes ?? b.wastedMs ?? 0) - (a.wastedBytes ?? a.wastedMs ?? 0))
    .slice(0, MAX_OPPORTUNITY_ITEMS)
    .map((it) => ({ url: it.url, wastedBytes: it.wastedBytes, wastedMs: it.wastedMs, totalBytes: it.totalBytes }));
  return auditItems.length > 0 ? auditItems : undefined;
}

function extractOpportunities(lighthouse: LighthouseResult | undefined): PageSpeedOpportunity[] {
  const auditRefs = lighthouse?.categories?.performance?.auditRefs ?? [];
  const items: PageSpeedOpportunity[] = [];
  for (const ref of auditRefs) {
    const audit = lighthouse?.audits?.[ref.id];
    // null score = informational only (nothing to act on); score 1 = passing.
    if (!audit || audit.score === null || audit.score === undefined || audit.score === 1) continue;

    if (ref.group === 'insights') {
      // Best per-metric improvement estimate (LCP/FCP/INP/TBT, in ms) — CLS
      // is excluded since it's a unitless shift score, not a time saving,
      // so it can't be compared/merged with the others.
      let bestMs = 0;
      for (const [metric, ms] of Object.entries(audit.metricSavings ?? {})) {
        if (metric === 'CLS') continue;
        if (typeof ms === 'number' && ms > bestMs) bestMs = ms;
      }
      if (bestMs >= 50) items.push({ title: audit.title ?? ref.id, savingsMs: bestMs, items: extractAuditItems(audit) });
    } else if (ref.group === 'diagnostics') {
      const savingsMs = audit.details?.overallSavingsMs;
      const savingsBytes = audit.details?.overallSavingsBytes;
      if ((savingsMs ?? 0) >= 100 || (savingsBytes ?? 0) >= 10_000) {
        items.push({ title: audit.title ?? ref.id, savingsMs, savingsBytes, items: extractAuditItems(audit) });
      }
    }
  }
  return items.sort((a, b) => (b.savingsMs ?? 0) - (a.savingsMs ?? 0)).slice(0, MAX_OPPORTUNITIES);
}

async function runStrategyCheck(url: string, strategy: 'mobile' | 'desktop', apiKey?: string): Promise<StrategyResult> {
  const params = new URLSearchParams({ url, strategy, category: 'performance' });
  if (apiKey) params.set('key', apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);
  try {
    const resp = await fetch(`${PSI_ENDPOINT}?${params}`, { signal: controller.signal });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`PageSpeed API returned HTTP ${resp.status}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }
    const data = await resp.json() as { lighthouseResult?: LighthouseResult };
    const lighthouse = data.lighthouseResult;
    const audits = lighthouse?.audits ?? {};
    const rawScore = lighthouse?.categories?.performance?.score;
    return {
      score: typeof rawScore === 'number' ? Math.round(rawScore * 100) : 0,
      lcp: audits['largest-contentful-paint']?.displayValue,
      cls: audits['cumulative-layout-shift']?.displayValue,
      tbt: audits['total-blocking-time']?.displayValue,
      fcp: audits['first-contentful-paint']?.displayValue,
      speedIndex: audits['speed-index']?.displayValue,
      opportunities: extractOpportunities(lighthouse),
    };
  } finally {
    clearTimeout(timer);
  }
}

// Mobile and desktop are two independent Lighthouse runs — running them
// concurrently for the same URL keeps the wall-clock cost per page close to
// a single run instead of doubling it.
export async function runPageSpeedCheck(url: string, apiKey?: string): Promise<PageSpeedResult> {
  const [mobile, desktop] = await Promise.all([
    runStrategyCheck(url, 'mobile', apiKey),
    runStrategyCheck(url, 'desktop', apiKey),
  ]);
  return { url, mobile, desktop };
}

// Runs PageSpeed Insights across `pages`, `CHECK_CONCURRENCY` at a time
// (sequential would be minutes-long for a real page list — PSI itself is
// the slow part, not anything we control, so the only lever we have is
// running several at once). Reports progress and lets the caller persist
// results incrementally and signal cancellation, same shape as
// crawlForBrokenLinks in crawler.ts.
export async function checkPageSpeed(
  pages: string[],
  apiKey: string | undefined,
  onProgress: (checked: number) => Promise<void> | void,
  onResult: (result: PageSpeedResult) => Promise<void> | void,
  isCancelled?: () => Promise<boolean> | boolean
): Promise<{ cancelled: boolean }> {
  const queue = [...pages];
  let checked = 0;
  let cancelled = false;

  async function worker() {
    for (;;) {
      if (cancelled) return;
      const url = queue.shift();
      if (!url) return;
      try {
        const result = await runPageSpeedCheck(url, apiKey);
        await onResult(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[worker] PageSpeed check failed for ${url}:`, message);
        // Google's PSI quota (especially unauthenticated) is easy to trip
        // when several workers hit it concurrently — back off briefly so a
        // 429 doesn't just get re-triggered by the very next queued URL.
        if (message.includes('429')) await new Promise((r) => setTimeout(r, 3_000));
      }
      checked++;
      await onProgress(checked);
      if (isCancelled) cancelled = await isCancelled();
    }
  }

  await Promise.all(Array.from({ length: CHECK_CONCURRENCY }, worker));
  return { cancelled };
}
