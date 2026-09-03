import { config } from 'dotenv';
config({ path: '.env.local' });
import WebSocket from 'ws';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { crawlForBrokenLinks, type BrokenLinkResult } from './crawler.js';
import { discoverInternalPages, checkPageSpeed, type PageSpeedResult } from './pagespeed.js';
import { runAeoCheck, AEO_THRESHOLDS, type AeoResult } from './aeo.js';
import { ENGINE_CALLERS, classifySentiment, detectBrandSignals, detectCompetitorsMentioned, type EngineName } from './engines.js';

const GOOGLE_PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY;
if (!GOOGLE_PAGESPEED_API_KEY) {
  console.warn('[worker] PAGESPEED_API_KEY not set — Page Speed checks will run unauthenticated (Google rate-limits this heavily). Get a free key from Google Cloud Console → PageSpeed Insights API.');
}

// AI Visibility Tracker (aeo.md Module B/C) engine keys — any subset can be
// configured; missing keys just mean that engine is skipped for a run
// rather than the whole feature being blocked. ANTHROPIC_API_KEY doubles as
// both the 'claude' engine AND the sentiment classifier for every engine's
// results (see classifySentiment in engines.ts).
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const ENGINE_API_KEYS: Record<EngineName, string | undefined> = {
  chatgpt: OPENAI_API_KEY, claude: ANTHROPIC_API_KEY, perplexity: PERPLEXITY_API_KEY, gemini: GOOGLE_AI_API_KEY,
};
if (Object.values(ENGINE_API_KEYS).every((k) => !k)) {
  console.warn('[worker] No AI Visibility engine keys set (OPENAI_API_KEY/ANTHROPIC_API_KEY/PERPLEXITY_API_KEY/GOOGLE_AI_API_KEY) — AI Visibility runs will fail until at least one is configured in apps/worker/.env.local.');
}

// supabase-js's realtime client needs a global WebSocket implementation on
// Node < 22 — we don't use realtime subscriptions here (just REST-style
// table queries), but the client still initializes it internally on construction.
(globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[worker] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — copy them from apps/dashboard/.env.local into apps/worker/.env.local');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const POLL_INTERVAL_MS = 5_000;

interface ScanJob {
  id: string;
  monitor_id: string;
  project_id: string;
  check_type: string;
}

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

// Single-worker-instance assumption: this claim isn't atomic (select then
// update, not a locking read) — fine with exactly one worker process, but
// would need an RPC-based atomic claim (e.g. `FOR UPDATE SKIP LOCKED`) before
// running more than one worker replica.
async function claimNextJob(): Promise<ScanJob | null> {
  const { data: pending } = await supabase
    .from('monitor_scan_jobs')
    .select('id, monitor_id, project_id, check_type')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!pending) return null;

  const { data: claimed, error } = await supabase
    .from('monitor_scan_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', pending.id)
    .eq('status', 'pending') // guards against a race if a second worker claims first
    .select('id, monitor_id, project_id, check_type')
    .maybeSingle();

  if (error || !claimed) return null;
  return claimed;
}

async function reportProgress(jobId: string, pagesCrawled: number, linksChecked: number) {
  await supabase
    .from('monitor_scan_jobs')
    .update({ pages_crawled: pagesCrawled, links_checked: linksChecked })
    .eq('id', jobId);
}

// The dashboard flips a running job to 'cancelling' when the user hits "Stop
// scan" (it can't just set 'cancelled' directly — this worker process is the
// only thing that knows the crawl has actually unwound). Checked on the same
// cadence as reportProgress above (see crawler.ts's isCancelled param).
async function isJobCancelling(jobId: string): Promise<boolean> {
  const { data } = await supabase.from('monitor_scan_jobs').select('status').eq('id', jobId).maybeSingle();
  return data?.status === 'cancelling';
}

// Upserts findings as soon as they're known — called both mid-crawl (as
// batches of newly-confirmed broken links come in from the crawler, so they
// show up in the UI while the scan is still running) and once more at the
// end with the complete result set, which also corrects anything an earlier
// batch reported with incomplete `pages` data (a link found on more pages
// later in the crawl).
async function upsertBrokenLinkFindings(job: ScanJob, results: BrokenLinkResult[]) {
  if (results.length === 0) return;
  const now = new Date().toISOString();
  const rows = results.map((r) => ({
    monitor_id: job.monitor_id,
    project_id: job.project_id,
    rule_id: `broken-link-${hashString(r.href)}`,
    title: `Broken ${r.isExternal ? 'external' : 'internal'} link`,
    description: `"${(r.text || r.href).slice(0, 80)}" → ${r.href} (${r.detail || 'unreachable'}). Found on ${r.foundOnPages.length} page${r.foundOnPages.length > 1 ? 's' : ''}.`,
    help_url: r.href,
    priority: r.isExternal ? 'medium' : 'high',
    category: 'broken_links',
    pages: r.foundOnPages.map((pageUrl) => ({
      page_url: pageUrl,
      screenshot_path: null,
      node_html: `<a href="${r.href}">${r.text}</a>`.slice(0, 300),
      node_target: r.href,
    })),
    last_seen_at: now,
  }));
  const ruleIds = rows.map((r) => r.rule_id);

  const { error: upsertError } = await supabase
    .from('monitor_issues')
    .upsert(rows, { onConflict: 'monitor_id,rule_id' });
  if (upsertError) console.error('[worker] Issue upsert failed:', upsertError);

  await supabase
    .from('monitor_issues')
    .update({ status: 'open', resolved_at: null })
    .eq('monitor_id', job.monitor_id)
    .eq('category', 'broken_links')
    .eq('status', 'resolved')
    .in('rule_id', ruleIds);
}

// Auto-resolve previously-open broken-link issues not found in this crawl.
// Only safe to run once, after the crawl has fully finished — running it
// against a partial (mid-crawl) result set would resolve issues we simply
// haven't re-checked yet.
async function resolveStaleBrokenLinkFindings(job: ScanJob, foundRuleIds: string[]) {
  const now = new Date().toISOString();
  let resolveQuery = supabase
    .from('monitor_issues')
    .update({ status: 'resolved', resolved_at: now })
    .eq('monitor_id', job.monitor_id)
    .eq('category', 'broken_links')
    .eq('status', 'open');
  if (foundRuleIds.length > 0) {
    resolveQuery = resolveQuery.not('rule_id', 'in', `(${foundRuleIds.join(',')})`);
  }
  await resolveQuery;
}

// PSI's own score bands (0-49 poor / 50-89 needs improvement / 90-100 good)
// — only report pages that need attention, not every page checked. Flagged
// on whichever strategy (mobile or desktop) is worse, so a page that's fine
// on desktop but bad on mobile (the common case) still gets surfaced.
const PAGESPEED_ISSUE_THRESHOLD = 90;
const worstScore = (r: PageSpeedResult) => Math.min(r.mobile.score, r.desktop.score);

async function upsertPageSpeedFindings(job: ScanJob, results: PageSpeedResult[]) {
  const flagged = results.filter((r) => worstScore(r) < PAGESPEED_ISSUE_THRESHOLD);
  if (flagged.length === 0) return;
  const now = new Date().toISOString();
  const rows = flagged.map((r) => ({
    monitor_id: job.monitor_id,
    project_id: job.project_id,
    rule_id: `pagespeed-${hashString(r.url)}`,
    title: `Slow page speed — Mobile ${r.mobile.score}/100, Desktop ${r.desktop.score}/100`,
    // Structured JSON, not prose — the dashboard renders this as score
    // gauges + metrics + a "what to fix" list per strategy (see
    // monitor-client.tsx's parsePageSpeedDescription). This is the one issue
    // category where the raw data itself (not a one-line summary) is what's
    // actually useful to a developer.
    description: JSON.stringify({ mobile: r.mobile, desktop: r.desktop }),
    help_url: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(r.url)}`,
    priority: worstScore(r) < 50 ? 'high' : 'medium',
    category: 'seo',
    pages: [{ page_url: r.url, screenshot_path: null, node_html: '', node_target: r.url }],
    last_seen_at: now,
  }));
  const ruleIds = rows.map((r) => r.rule_id);

  const { error: upsertError } = await supabase
    .from('monitor_issues')
    .upsert(rows, { onConflict: 'monitor_id,rule_id' });
  if (upsertError) console.error('[worker] Page speed issue upsert failed:', upsertError);

  await supabase
    .from('monitor_issues')
    .update({ status: 'open', resolved_at: null })
    .eq('monitor_id', job.monitor_id)
    .eq('category', 'seo')
    .like('rule_id', 'pagespeed-%')
    .eq('status', 'resolved')
    .in('rule_id', ruleIds);
}

// Resolves previously-open page-speed issues for pages that were actually
// re-checked this run and now score well — takes the full set of
// successfully-checked rule_ids plus the subset that's still bad, rather
// than "not in the bad set", because a page that errored out (network
// failure, PSI quota, timeout) never got a real answer this run and must
// NOT be treated as "fixed" just because it didn't show up in the bad list.
// Scoped to rule_id LIKE 'pagespeed-%' so this never touches the unrelated
// 'seo' findings extractSeoFindings produces synchronously elsewhere (title/
// meta description/schema/etc. — see apps/dashboard/lib/monitor.ts) which
// share the same category but aren't this job's concern.
async function resolveStalePageSpeedFindings(job: ScanJob, checkedRuleIds: string[], badRuleIds: string[]) {
  const badSet = new Set(badRuleIds);
  const nowGoodRuleIds = checkedRuleIds.filter((id) => !badSet.has(id));
  if (nowGoodRuleIds.length === 0) return;
  const now = new Date().toISOString();
  await supabase
    .from('monitor_issues')
    .update({ status: 'resolved', resolved_at: now })
    .eq('monitor_id', job.monitor_id)
    .eq('category', 'seo')
    .like('rule_id', 'pagespeed-%')
    .eq('status', 'open')
    .in('rule_id', nowGoodRuleIds);
}

async function processBrokenLinksJob(job: ScanJob, targetUrl: string, maxPages: number) {
  const { results, cancelled } = await crawlForBrokenLinks(
    targetUrl,
    maxPages,
    ({ pagesCrawled, linksChecked }) => reportProgress(job.id, pagesCrawled, linksChecked),
    (batch) => upsertBrokenLinkFindings(job, batch),
    () => isJobCancelling(job.id)
  );

  await upsertBrokenLinkFindings(job, results);

  if (cancelled) {
    // Don't auto-resolve issues not seen this run — we stopped partway
    // through, so "not found" here just means "not reached yet", not
    // "actually fixed". Whatever was found before the stop is kept (via
    // the upsert above and the incremental onBatch calls during the crawl).
    await supabase
      .from('monitor_scan_jobs')
      .update({ status: 'cancelled', completed_at: new Date().toISOString(), issues_found: results.length })
      .eq('id', job.id);
    console.log(`[worker] Job ${job.id} stopped by user — ${results.length} broken link(s) found before stopping`);
    return;
  }

  await resolveStaleBrokenLinkFindings(job, results.map((r) => `broken-link-${hashString(r.href)}`));

  await supabase
    .from('monitor_scan_jobs')
    .update({ status: 'completed', completed_at: new Date().toISOString(), issues_found: results.length })
    .eq('id', job.id);

  console.log(`[worker] Job ${job.id} completed — ${results.length} broken link(s) found`);
}

async function processPageSpeedJob(job: ScanJob, targetUrl: string, maxPages: number) {
  const pages = await discoverInternalPages(targetUrl, maxPages);
  // pages_crawled doubles as "pages discovered" here so the dashboard's
  // existing progress display works unmodified; links_checked is unused by
  // this check type (left at its 0 default).
  await reportProgress(job.id, pages.length, 0);

  const allResults: PageSpeedResult[] = [];
  let checkedCount = 0;
  const { cancelled } = await checkPageSpeed(
    pages,
    GOOGLE_PAGESPEED_API_KEY,
    async (checked) => { checkedCount = checked; await reportProgress(job.id, pages.length, checkedCount); },
    async (result) => {
      allResults.push(result);
      await upsertPageSpeedFindings(job, [result]);
    },
    () => isJobCancelling(job.id)
  );

  const badResults = allResults.filter((r) => worstScore(r) < PAGESPEED_ISSUE_THRESHOLD);

  if (cancelled) {
    await supabase
      .from('monitor_scan_jobs')
      .update({ status: 'cancelled', completed_at: new Date().toISOString(), issues_found: badResults.length })
      .eq('id', job.id);
    console.log(`[worker] Job ${job.id} stopped by user — checked ${checkedCount}/${pages.length} page(s), ${badResults.length} slow page(s) found before stopping`);
    return;
  }

  // Only resolve stale findings among pages we actually got a real answer
  // for this run (checkPageSpeed logs and skips a page on error rather than
  // calling onResult for it, so a URL missing from allResults never got
  // verified and must not be treated as "fixed").
  await resolveStalePageSpeedFindings(
    job,
    allResults.map((r) => `pagespeed-${hashString(r.url)}`),
    badResults.map((r) => `pagespeed-${hashString(r.url)}`)
  );

  await supabase
    .from('monitor_scan_jobs')
    .update({ status: 'completed', completed_at: new Date().toISOString(), issues_found: badResults.length })
    .eq('id', job.id);

  console.log(`[worker] Job ${job.id} completed — checked ${pages.length} page(s), ${badResults.length} slow page(s) found`);
}

// AEO (Answer/AI-search Engine Optimization) findings — all deterministic
// (see apps/worker/src/aeo.ts), no AI call. Two site-level checks (AI
// crawlers blocked in robots.txt, missing llms.txt) plus three per-page
// checks grouped into one issue each across every affected page, matching
// how extractLegalFindings groups site-wide checks in apps/dashboard/lib/monitor.ts.
async function upsertAeoFindings(job: ScanJob, targetUrl: string, result: AeoResult) {
  const now = new Date().toISOString();
  const rows: Array<{
    monitor_id: string; project_id: string; rule_id: string; title: string; description: string;
    help_url: string; priority: string; category: string;
    pages: Array<{ page_url: string; screenshot_path: null; node_html: string; node_target: string }>;
    last_seen_at: string;
  }> = [];

  const addSiteLevel = (ruleId: string, title: string, description: string, priority: string, helpUrl = '') => {
    rows.push({
      monitor_id: job.monitor_id, project_id: job.project_id, rule_id: `aeo-${ruleId}`, title, description,
      help_url: helpUrl, priority, category: 'seo',
      pages: [{ page_url: targetUrl, screenshot_path: null, node_html: '', node_target: '' }],
      last_seen_at: now,
    });
  };
  const addGrouped = (ruleId: string, title: string, description: string, priority: string, affectedUrls: string[]) => {
    if (affectedUrls.length === 0) return;
    rows.push({
      monitor_id: job.monitor_id, project_id: job.project_id, rule_id: `aeo-${ruleId}`, title, description,
      help_url: '', priority, category: 'seo',
      pages: affectedUrls.map((u) => ({ page_url: u, screenshot_path: null, node_html: '', node_target: '' })),
      last_seen_at: now,
    });
  };

  if (result.blockedAiCrawlers.length > 0) {
    const list = result.blockedAiCrawlers.map((b) => b.label).join(', ');
    addSiteLevel(
      'ai-crawlers-blocked',
      `${result.blockedAiCrawlers.length} AI crawler${result.blockedAiCrawlers.length > 1 ? 's' : ''} blocked in robots.txt`,
      `robots.txt disallows: ${list}. These bots can't read or cite this site in AI answers (ChatGPT, Claude, Perplexity, Google AI Overviews, etc.) while blocked.`,
      'critical',
      `${new URL(targetUrl).origin}/robots.txt`
    );
  }
  if (!result.hasLlmsTxt) {
    addSiteLevel(
      'missing-llms-txt',
      'No llms.txt found',
      'llms.txt is an emerging standard (llmstxt.org) that gives AI crawlers a curated map of your most important content. Not yet universally adopted, but a low-cost way to help AI engines find and cite the right pages.',
      'low'
    );
  }
  if (!result.hasValidSitemap) {
    addSiteLevel(
      'missing-sitemap',
      'No valid sitemap.xml found',
      'Could not find a parseable sitemap.xml or sitemap_index.xml — a sitemap is one of the clearest signals search and AI crawlers use to discover every page on a site instead of relying on internal links alone.',
      'medium',
      `${new URL(targetUrl).origin}/sitemap.xml`
    );
  }

  addGrouped(
    'js-required-content',
    'Page content may be invisible to AI crawlers',
    `Fetched HTML has very little text content — most AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) don't execute JavaScript, so if this page's real content is rendered client-side, they see an empty shell instead of your content.`,
    'high',
    result.pages.filter((p) => p.wordCount < AEO_THRESHOLDS.MIN_WORDS_FOR_JS_WARNING).map((p) => p.url)
  );
  addGrouped(
    'missing-faq-schema',
    'Q&A-style page missing FAQPage schema',
    'This page has multiple question-style headings but no FAQPage structured data (JSON-LD) — adding it lets AI engines and search results cite your exact Q&A pairs directly instead of guessing at the answer.',
    'medium',
    result.pages.filter((p) => p.qaHeadingCount >= 2 && !p.schemaTypes.includes('FAQPage')).map((p) => p.url)
  );
  addGrouped(
    'missing-freshness-date',
    'Long-form page missing a published/updated date',
    'This page has substantial content but no datePublished/dateModified in its structured data — AI engines weigh content freshness when deciding what to cite, and this page has no machine-readable date to show.',
    'low',
    result.pages.filter((p) => p.wordCount >= AEO_THRESHOLDS.MIN_WORDS_FOR_FRESHNESS_CHECK && !p.hasFreshnessDate).map((p) => p.url)
  );
  addGrouped(
    'missing-author-info',
    'Long-form page missing author/byline signals',
    'No author schema, meta author tag, or visible byline found on a substantial page — E-E-A-T (Experience, Expertise, Authoritativeness, Trust) signals like a named author help both search rankings and how confidently AI engines cite this content.',
    'medium',
    result.pages.filter((p) => p.wordCount >= AEO_THRESHOLDS.MIN_WORDS_FOR_FRESHNESS_CHECK && !p.hasAuthorInfo).map((p) => p.url)
  );
  addGrouped(
    'heading-hierarchy-skip',
    'Heading levels skip a level',
    'A heading jumps more than one level deeper than the previous one (e.g. H1 straight to H3 with no H2) — this breaks the document outline AI crawlers and screen readers use to understand how content is organized.',
    'medium',
    result.pages.filter((p) => !p.headingHierarchyOk).map((p) => p.url)
  );
  addGrouped(
    'missing-twitter-card',
    'Missing Twitter/X Card meta tag',
    'No twitter:card meta tag found — without it, links shared on X/Twitter (and some AI chat surfaces that render link previews) fall back to a generic, unstyled preview instead of a proper title/image/description card.',
    'low',
    result.pages.filter((p) => !p.hasTwitterCard).map((p) => p.url)
  );
  addGrouped(
    'render-blocking-scripts',
    'Multiple render-blocking scripts in <head>',
    `More than ${AEO_THRESHOLDS.MAX_ACCEPTABLE_RENDER_BLOCKING_SCRIPTS} scripts in <head> load without async/defer — this delays first paint for real visitors and slows down how quickly a crawler (AI or otherwise) can get to the actual content.`,
    'medium',
    result.pages.filter((p) => p.renderBlockingScriptCount > AEO_THRESHOLDS.MAX_ACCEPTABLE_RENDER_BLOCKING_SCRIPTS).map((p) => p.url)
  );
  addGrouped(
    'mixed-content',
    'Mixed content — HTTP resources on an HTTPS page',
    'This page loads at least one resource (image, script, stylesheet, or iframe) over plain HTTP while the page itself is HTTPS — browsers block or warn on this, and it\'s a signal of a stale/broken page that AI crawlers may deprioritize.',
    'high',
    result.pages.filter((p) => p.hasMixedContent).map((p) => p.url)
  );

  const ruleIds = rows.map((r) => r.rule_id);
  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from('monitor_issues').upsert(rows, { onConflict: 'monitor_id,rule_id' });
    if (upsertError) console.error('[worker] AEO issue upsert failed:', upsertError);

    await supabase
      .from('monitor_issues')
      .update({ status: 'open', resolved_at: null })
      .eq('monitor_id', job.monitor_id)
      .like('rule_id', 'aeo-%')
      .eq('status', 'resolved')
      .in('rule_id', ruleIds);
  }

  // Every possible aeo-* rule not found this run is now fixed — resolve it.
  // Scoped to rule_id LIKE 'aeo-%' so this never touches unrelated 'seo'
  // findings (extractSeoFindings / pagespeed-*) that share the same category.
  const allPossibleRuleIds = [
    'ai-crawlers-blocked', 'missing-llms-txt', 'missing-sitemap', 'js-required-content', 'missing-faq-schema',
    'missing-freshness-date', 'missing-author-info', 'heading-hierarchy-skip', 'missing-twitter-card',
    'render-blocking-scripts', 'mixed-content',
  ].map((id) => `aeo-${id}`);
  const staleRuleIds = allPossibleRuleIds.filter((id) => !ruleIds.includes(id));
  if (staleRuleIds.length > 0) {
    await supabase
      .from('monitor_issues')
      .update({ status: 'resolved', resolved_at: now })
      .eq('monitor_id', job.monitor_id)
      .eq('status', 'open')
      .in('rule_id', staleRuleIds);
  }

  return rows.length;
}

async function processAeoJob(job: ScanJob, targetUrl: string, maxPages: number) {
  const pages = await discoverInternalPages(targetUrl, maxPages);
  await reportProgress(job.id, pages.length, 0);

  const { result, cancelled } = await runAeoCheck(
    targetUrl,
    pages,
    async (checked) => { await reportProgress(job.id, pages.length, checked); },
    () => isJobCancelling(job.id)
  );

  if (cancelled) {
    await supabase
      .from('monitor_scan_jobs')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', job.id);
    console.log(`[worker] Job ${job.id} stopped by user — checked ${result.pages.length}/${pages.length} page(s) before stopping`);
    return;
  }

  const issuesFound = await upsertAeoFindings(job, targetUrl, result);

  await supabase
    .from('monitor_scan_jobs')
    .update({ status: 'completed', completed_at: new Date().toISOString(), issues_found: issuesFound })
    .eq('id', job.id);

  console.log(`[worker] Job ${job.id} completed — checked ${pages.length} page(s), ${issuesFound} AEO issue(s) found`);
}

async function processJob(job: ScanJob) {
  console.log(`[worker] Starting job ${job.id} (${job.check_type}) for monitor ${job.monitor_id}`);
  try {
    const { data: monitor, error } = await supabase
      .from('project_monitors')
      .select('target_url, max_pages')
      .eq('id', job.monitor_id)
      .single();
    if (error || !monitor) throw new Error('Could not load monitor config');

    if (job.check_type === 'page_speed') {
      await processPageSpeedJob(job, monitor.target_url, monitor.max_pages ?? 10);
    } else if (job.check_type === 'aeo') {
      await processAeoJob(job, monitor.target_url, monitor.max_pages ?? 10);
    } else {
      await processBrokenLinksJob(job, monitor.target_url, monitor.max_pages ?? 10);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[worker] Job ${job.id} failed:`, message);
    await supabase
      .from('monitor_scan_jobs')
      .update({ status: 'failed', completed_at: new Date().toISOString(), error: message })
      .eq('id', job.id);
  }
}

// ─── AI Visibility Tracker (aeo.md Module B/C) ─────────────────────────────
// A separate table (aeo_visibility_runs), not monitor_scan_jobs — this
// produces aeo_prompt_results rows, not monitor_issues, and isn't tied to a
// check_type the dashboard's existing scan-jobs polling route understands.
// Same claim-then-verify pattern as claimNextJob above (single-worker-
// instance assumption).

interface VisibilityRun { id: string; monitor_id: string; project_id: string }

async function claimNextVisibilityRun(): Promise<VisibilityRun | null> {
  const { data: pending } = await supabase
    .from('aeo_visibility_runs')
    .select('id, monitor_id, project_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!pending) return null;

  const { data: claimed, error } = await supabase
    .from('aeo_visibility_runs')
    .update({ status: 'running' })
    .eq('id', pending.id)
    .eq('status', 'pending')
    .select('id, monitor_id, project_id')
    .maybeSingle();
  if (error || !claimed) return null;
  return claimed;
}

async function processVisibilityRun(run: VisibilityRun) {
  console.log(`[worker] Starting AI Visibility run ${run.id} for monitor ${run.monitor_id}`);
  try {
    const [promptsRes, competitorsRes, projectRes] = await Promise.all([
      supabase.from('aeo_prompts').select('id, prompt_text').eq('monitor_id', run.monitor_id),
      supabase.from('aeo_competitors').select('name, domain').eq('monitor_id', run.monitor_id),
      supabase.from('projects').select('name, domain').eq('id', run.project_id).single(),
    ]);
    const prompts = promptsRes.data ?? [];
    const competitors = competitorsRes.data ?? [];
    const project = projectRes.data;

    if (prompts.length === 0) throw new Error('No prompts configured — add at least one prompt before running a check.');
    if (!project?.name) throw new Error('Could not load the project name to use as the brand name.');

    const brandName = project.name as string;
    const brandDomain = (project.domain as string | null) ?? '';
    const availableEngines = (Object.entries(ENGINE_API_KEYS) as [EngineName, string | undefined][])
      .filter(([, key]) => !!key)
      .map(([engine]) => engine);
    if (availableEngines.length === 0) throw new Error('No engine API keys configured (OPENAI_API_KEY/ANTHROPIC_API_KEY/PERPLEXITY_API_KEY/GOOGLE_AI_API_KEY).');

    const totalCalls = prompts.length * availableEngines.length;
    await supabase.from('aeo_visibility_runs').update({ total_calls: totalCalls }).eq('id', run.id);

    let completed = 0;
    for (const prompt of prompts) {
      for (const engine of availableEngines) {
        const apiKey = ENGINE_API_KEYS[engine]!;
        const result = await ENGINE_CALLERS[engine](prompt.prompt_text, apiKey);

        let signals = { mentioned: false, cited: false, position: null as 'early' | 'mid' | 'late' | null };
        let competitorsMentioned: string[] = [];
        let sentiment: { score: number; justification: string } | null = null;

        if (result.ok) {
          signals = detectBrandSignals(result.responseText, result.citedUrls, brandName, brandDomain);
          competitorsMentioned = detectCompetitorsMentioned(result.responseText, result.citedUrls, competitors);
          // Only spend a sentiment-classification call when there's
          // actually a brand mention to classify.
          if (signals.mentioned && ANTHROPIC_API_KEY) {
            sentiment = await classifySentiment(result.responseText, brandName, ANTHROPIC_API_KEY);
          }
        } else {
          console.error(`[worker] ${engine} call failed for prompt ${prompt.id}:`, result.error);
        }

        const { error: insertError } = await supabase.from('aeo_prompt_results').insert({
          run_id: run.id, monitor_id: run.monitor_id, project_id: run.project_id, prompt_id: prompt.id,
          engine, raw_response: result.responseText || null, cited_urls: result.citedUrls,
          brand_mentioned: signals.mentioned, brand_cited: signals.cited, position: signals.position,
          competitors_mentioned: competitorsMentioned,
          sentiment_score: sentiment?.score ?? null, sentiment_justification: sentiment?.justification ?? null,
          error: result.error ?? null,
        });
        if (insertError) console.error('[worker] Failed to insert AI Visibility result:', insertError);

        completed++;
        await supabase.from('aeo_visibility_runs').update({ completed_calls: completed }).eq('id', run.id);
      }
    }

    await supabase
      .from('aeo_visibility_runs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', run.id);
    console.log(`[worker] AI Visibility run ${run.id} completed — ${completed}/${totalCalls} calls`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[worker] AI Visibility run ${run.id} failed:`, message);
    await supabase
      .from('aeo_visibility_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString(), error: message })
      .eq('id', run.id);
  }
}

// Single-worker-instance assumption (see claimNextJob above): if this
// process is starting up and finds a job already marked 'running', that row
// can only be left over from a previous instance of this same worker that
// crashed or was restarted mid-crawl — its in-memory crawl state (visited
// pages, link queue, etc.) is gone, so the job can't be resumed. Reset it to
// 'pending' with counters zeroed so it gets picked up and re-run from
// scratch, instead of sitting stuck as 'running' forever with no process
// ever going to finish it.
async function requeueOrphanedJobs() {
  const { data: orphaned } = await supabase
    .from('monitor_scan_jobs')
    .select('id, status')
    .in('status', ['running', 'cancelling']);
  if (!orphaned || orphaned.length === 0) return;

  const runningIds = orphaned.filter((j) => j.status === 'running').map((j) => j.id);
  const cancellingIds = orphaned.filter((j) => j.status === 'cancelling').map((j) => j.id);

  if (runningIds.length > 0) {
    await supabase
      .from('monitor_scan_jobs')
      .update({ status: 'pending', pages_crawled: 0, links_checked: 0, started_at: null })
      .in('id', runningIds);
  }
  if (cancellingIds.length > 0) {
    // The user already asked to stop these — don't resurrect them as
    // 'pending' (that would silently restart a scan someone deliberately
    // stopped). Whatever the crawl found before the crash is already saved.
    await supabase
      .from('monitor_scan_jobs')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .in('id', cancellingIds);
  }
  console.log(`[worker] Recovered ${orphaned.length} orphaned job(s) left by a previous process (${runningIds.length} requeued, ${cancellingIds.length} cancelled)`);
}

// Same reasoning as requeueOrphanedJobs above, for AI Visibility runs — no
// 'cancelling' state exists for these (no stop button, runs are short-ish
// manual triggers), so every orphaned 'running' row just gets requeued.
async function requeueOrphanedVisibilityRuns() {
  const { data: orphaned } = await supabase
    .from('aeo_visibility_runs')
    .select('id')
    .eq('status', 'running');
  if (!orphaned || orphaned.length === 0) return;
  await supabase
    .from('aeo_visibility_runs')
    .update({ status: 'pending', completed_calls: 0 })
    .in('id', orphaned.map((r) => r.id));
  console.log(`[worker] Recovered ${orphaned.length} orphaned AI Visibility run(s) left by a previous process`);
}

async function pollLoop() {
  for (;;) {
    try {
      const job = await claimNextJob();
      if (job) {
        await processJob(job);
        continue; // check for another job immediately instead of waiting out the poll interval
      }
      const visibilityRun = await claimNextVisibilityRun();
      if (visibilityRun) {
        await processVisibilityRun(visibilityRun);
        continue;
      }
    } catch (err) {
      console.error('[worker] Poll loop error:', err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

console.log('[worker] Pinmarks monitor worker started — polling for scan jobs every', POLL_INTERVAL_MS / 1000, 'seconds');
void Promise.all([requeueOrphanedJobs(), requeueOrphanedVisibilityRuns()]).then(pollLoop);
