import { load } from 'cheerio';
import { BOT_UA } from './crawler.js';

// AEO (Answer/AI-search Engine Optimization) — entirely deterministic checks,
// no AI model call. Everything here is either a plain-text fetch (robots.txt,
// llms.txt) or a cheerio parse of the same raw HTML a non-JS AI crawler would
// see — no headless browser, matching how the rest of this worker (crawler.ts,
// pagespeed.ts) already works without Puppeteer.
const PAGE_TIMEOUT_MS = 8_000;
const CHECK_CONCURRENCY = 5;
// Below this, a page is treated as "effectively empty" to a crawler that
// doesn't execute JavaScript — most known AI bots (see AI_CRAWLERS below)
// don't render JS, so a React/Vue SPA shell that only fills in via
// client-side JS is invisible to them even though a human sees a full page.
const MIN_WORDS_FOR_JS_WARNING = 50;
// A page needs real substance before "no freshness date" is worth flagging —
// a 4-word stub page isn't an "article" that needs a dateModified.
const MIN_WORDS_FOR_FRESHNESS_CHECK = 300;

// Public, well-documented user-agent tokens site owners block/allow in
// robots.txt for each of these — sourced from each company's own crawler
// docs. Kept as plain data so adding a newly-announced bot later is a
// one-line change, not a logic change.
export const AI_CRAWLERS: { token: string; label: string }[] = [
  { token: 'gptbot', label: 'GPTBot (OpenAI — trains ChatGPT)' },
  { token: 'chatgpt-user', label: 'ChatGPT-User (OpenAI — live browsing)' },
  { token: 'oai-searchbot', label: 'OAI-SearchBot (OpenAI — ChatGPT search)' },
  { token: 'anthropic-ai', label: 'anthropic-ai (Claude)' },
  { token: 'claudebot', label: 'ClaudeBot (Anthropic)' },
  { token: 'claude-web', label: 'Claude-Web (Anthropic — live browsing)' },
  { token: 'perplexitybot', label: 'PerplexityBot' },
  { token: 'perplexity-user', label: 'Perplexity-User (live browsing)' },
  { token: 'google-extended', label: 'Google-Extended (Gemini / AI Overviews)' },
  { token: 'ccbot', label: 'CCBot (Common Crawl — feeds many AI models)' },
  { token: 'bytespider', label: 'Bytespider (ByteDance AI)' },
  { token: 'applebot-extended', label: 'Applebot-Extended (Apple Intelligence)' },
  { token: 'amazonbot', label: 'Amazonbot (Alexa+/AI)' },
  { token: 'diffbot', label: 'Diffbot' },
];

async function fetchText(url: string): Promise<{ ok: boolean; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': BOT_UA }, signal: controller.signal });
    return { ok: resp.ok, text: resp.ok ? await resp.text() : '' };
  } catch {
    return { ok: false, text: '' };
  } finally {
    clearTimeout(timer);
  }
}

interface RobotsGroup { agents: string[]; disallowAll: boolean }

// Standard robots.txt grouping: consecutive `User-agent:` lines merge into
// one group; a `User-agent:` line seen after a rule line starts a new group.
function parseRobotsGroups(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let sawRuleInCurrent = false;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === 'user-agent') {
      if (!current || sawRuleInCurrent) {
        current = { agents: [], disallowAll: false };
        groups.push(current);
        sawRuleInCurrent = false;
      }
      current.agents.push(value.toLowerCase());
    } else if (key === 'disallow' && current) {
      sawRuleInCurrent = true;
      if (value === '/') current.disallowAll = true;
    } else if (key === 'allow' && current) {
      sawRuleInCurrent = true;
      if (value === '/') current.disallowAll = false; // explicit re-allow overrides an earlier blanket Disallow
    }
  }
  return groups;
}

// A bot with its own explicit group is governed by that group alone (robots.txt
// precedence: most-specific User-agent wins) — only falls back to the
// wildcard `*` group when it has no group of its own.
export function findBlockedAiCrawlers(robotsTxt: string): { token: string; label: string }[] {
  const groups = parseRobotsGroups(robotsTxt);
  const wildcard = groups.find((g) => g.agents.includes('*'));
  const wildcardBlocksAll = wildcard?.disallowAll ?? false;

  return AI_CRAWLERS.filter(({ token }) => {
    const specific = groups.find((g) => g.agents.includes(token));
    return specific ? specific.disallowAll : wildcardBlocksAll;
  });
}

export interface PageAeoSignals {
  url: string;
  wordCount: number;
  qaHeadingCount: number;
  schemaTypes: string[];
  hasFreshnessDate: boolean;
  hasAuthorInfo: boolean;
  headingHierarchyOk: boolean;
  hasTwitterCard: boolean;
  renderBlockingScriptCount: number;
  hasMixedContent: boolean;
}

function extractSchemaSignals($: ReturnType<typeof load>): { types: string[]; hasDate: boolean; hasAuthor: boolean } {
  const types: string[] = [];
  let hasDate = false;
  let hasAuthor = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed: unknown = JSON.parse($(el).contents().text());
      const items: unknown[] = Array.isArray(parsed)
        ? parsed
        : (parsed && typeof parsed === 'object' && Array.isArray((parsed as { ['@graph']?: unknown[] })['@graph']))
          ? (parsed as { ['@graph']: unknown[] })['@graph']
          : [parsed];
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const obj = item as Record<string, unknown>;
        const t = obj['@type'];
        if (Array.isArray(t)) types.push(...t.map(String));
        else if (typeof t === 'string') types.push(t);
        if (obj.datePublished || obj.dateModified) hasDate = true;
        if (obj.author) hasAuthor = true;
      }
    } catch {
      // malformed JSON-LD — not our job to lint their schema syntax, skip
    }
  });
  return { types, hasDate, hasAuthor };
}

// A "skip" is a heading level jumping more than one deeper than the deepest
// level seen so far (e.g. H1 straight to H3 with no H2) — breaks the
// document outline AI crawlers use to understand content structure. Going
// back UP (H3 then H2) is normal nesting, not a skip.
function checkHeadingHierarchy($: ReturnType<typeof load>): boolean {
  let maxLevelSeen = 0;
  let ok = true;
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = Number(el.tagName.slice(1));
    if (level > maxLevelSeen + 1) ok = false;
    maxLevelSeen = Math.max(maxLevelSeen, level);
  });
  return ok;
}

function checkAuthorMarkup($: ReturnType<typeof load>, hasAuthorSchema: boolean): boolean {
  if (hasAuthorSchema) return true;
  if ($('meta[name="author"]').length > 0) return true;
  return $('[rel="author"], .author, .byline, [itemprop="author"]').length > 0;
}

function checkRenderBlockingScripts($: ReturnType<typeof load>): number {
  let count = 0;
  $('head script[src]').each((_, el) => {
    const $el = $(el);
    if ($el.attr('async') === undefined && $el.attr('defer') === undefined && $el.attr('type') !== 'module') count++;
  });
  return count;
}

function checkMixedContent($: ReturnType<typeof load>, pageUrl: string): boolean {
  if (!pageUrl.startsWith('https://')) return false;
  let found = false;
  $('img[src], script[src], link[href], iframe[src]').each((_, el) => {
    const attr = $(el).attr('src') ?? $(el).attr('href') ?? '';
    if (attr.startsWith('http://')) found = true;
  });
  return found;
}

async function fetchPageAeoSignals(url: string): Promise<PageAeoSignals | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': BOT_UA }, redirect: 'follow', signal: controller.signal });
    const contentType = resp.headers.get('content-type') ?? '';
    if (!resp.ok || !contentType.includes('html')) return null;
    const html = await resp.text();
    const $ = load(html);
    const { types, hasDate, hasAuthor } = extractSchemaSignals($);

    const qaHeadingCount = [
      ...$('h2').map((_, el) => $(el).text().trim()).get(),
      ...$('h3').map((_, el) => $(el).text().trim()).get(),
    ].filter((h) => h.endsWith('?')).length;

    // These all need the original DOM (script tags, meta tags, resource
    // URLs) — must run before script/style get stripped for the word count
    // below.
    const headingHierarchyOk = checkHeadingHierarchy($);
    const hasAuthorInfo = checkAuthorMarkup($, hasAuthor);
    const hasTwitterCard = $('meta[name="twitter:card"]').length > 0;
    const renderBlockingScriptCount = checkRenderBlockingScripts($);
    const hasMixedContent = checkMixedContent($, url);

    $('script, style, noscript').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

    return {
      url, wordCount, qaHeadingCount, schemaTypes: types, hasFreshnessDate: hasDate,
      hasAuthorInfo, headingHierarchyOk, hasTwitterCard, renderBlockingScriptCount, hasMixedContent,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// A sitemap can live at either path — sitemap_index.xml for larger sites
// that split into multiple sub-sitemaps. Just needs to parse as a real
// sitemap with at least one entry; not validating every <loc> resolves (that
// would be a full extra crawl of its own).
async function checkSitemap(origin: string): Promise<boolean> {
  for (const path of ['/sitemap.xml', '/sitemap_index.xml']) {
    const { ok, text } = await fetchText(`${origin}${path}`);
    if (ok && /<(urlset|sitemapindex)[\s>]/i.test(text) && /<loc>/i.test(text)) return true;
  }
  return false;
}

export interface AeoResult {
  hasRobotsTxt: boolean;
  hasLlmsTxt: boolean;
  hasValidSitemap: boolean;
  blockedAiCrawlers: { token: string; label: string }[];
  pages: PageAeoSignals[];
}

// Runs `CHECK_CONCURRENCY` pages at a time, same shape as pagespeed.ts's
// checkPageSpeed — site-level checks (robots.txt/llms.txt) run once up
// front, in parallel with nothing since they gate nothing else.
export async function runAeoCheck(
  targetUrl: string,
  pages: string[],
  onProgress: (checked: number) => Promise<void> | void,
  isCancelled?: () => Promise<boolean> | boolean
): Promise<{ result: AeoResult; cancelled: boolean }> {
  const origin = new URL(targetUrl).origin;
  const [robots, llms, hasValidSitemap] = await Promise.all([
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/llms.txt`),
    checkSitemap(origin),
  ]);
  const blockedAiCrawlers = robots.ok ? findBlockedAiCrawlers(robots.text) : [];

  const pageSignals: PageAeoSignals[] = [];
  const queue = [...pages];
  let checked = 0;
  let cancelled = false;

  async function worker() {
    for (;;) {
      if (cancelled) return;
      const url = queue.shift();
      if (!url) return;
      const signals = await fetchPageAeoSignals(url);
      if (signals) pageSignals.push(signals);
      checked++;
      await onProgress(checked);
      if (isCancelled) cancelled = await isCancelled();
    }
  }

  await Promise.all(Array.from({ length: CHECK_CONCURRENCY }, worker));

  return {
    result: { hasRobotsTxt: robots.ok, hasLlmsTxt: llms.ok, hasValidSitemap, blockedAiCrawlers, pages: pageSignals },
    cancelled,
  };
}

// A render-blocking script or two is normal (analytics, a small vendor
// snippet) — only worth flagging once there's a real pile-up delaying first
// paint/parse for both a real visitor and any crawler.
const MAX_ACCEPTABLE_RENDER_BLOCKING_SCRIPTS = 3;

export const AEO_THRESHOLDS = {
  MIN_WORDS_FOR_JS_WARNING,
  MIN_WORDS_FOR_FRESHNESS_CHECK,
  MAX_ACCEPTABLE_RENDER_BLOCKING_SCRIPTS,
};
