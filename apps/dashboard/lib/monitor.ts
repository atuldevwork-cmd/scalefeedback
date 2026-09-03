import Anthropic from '@anthropic-ai/sdk';
import type { PageContent } from './crawler';

export type MonitorCategory =
  | 'accessibility' | 'broken_links' | 'seo' | 'legal'
  | 'content_quality' | 'brand_consistency' | 'custom';

export interface MonitorFinding {
  ruleId: string;
  title: string;
  description: string;
  helpUrl: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  pageUrl: string;
  nodeHtml: string;
  nodeTarget: string;
  category: MonitorCategory;
}

const IMPACT_PRIORITY: Record<string, MonitorFinding['priority']> = {
  critical: 'critical',
  serious: 'high',
  moderate: 'medium',
  minor: 'low',
};

// Unlike ai-analyzer's axeAudit (which excludes a few rules already covered by its
// own SEO checks), Monitor surfaces every axe violation — it's the dedicated
// accessibility view, not blended with SEO/CRO/content issues.
export function extractFindings(page: PageContent): MonitorFinding[] {
  if (!page.axeViolations?.length) return [];
  return page.axeViolations.map((v) => {
    const firstNode = v.nodes[0];
    return {
      ruleId: v.id,
      title: v.help.slice(0, 100),
      description: (firstNode?.failureSummary || v.description).slice(0, 300),
      helpUrl: v.helpUrl,
      priority: IMPACT_PRIORITY[v.impact ?? 'minor'] ?? 'low',
      pageUrl: page.url,
      nodeHtml: firstNode?.html?.slice(0, 300) ?? '',
      nodeTarget: firstNode?.target?.join(' ') ?? '',
      category: 'accessibility' as const,
    };
  });
}

// A critical violation should drag the score down more than a minor one —
// counting every violation as equally "1 failed check" (the naive approach)
// would score "10 minor spacing issues" the same as "1 critical missing
// form label", which isn't a fair read of how accessible a site actually is.
const IMPACT_WEIGHT: Record<string, number> = { critical: 4, serious: 3, moderate: 2, minor: 1 };

export interface AccessibilityScoreResult {
  // 0-100, weighted pass rate across every axe check run on every scanned
  // page — null when axe never actually ran (e.g. Puppeteer unavailable, so
  // the crawler fell back to plain fetch), so callers can tell "no data" from
  // a genuine perfect 100.
  score: number | null;
  // Total individual failing elements found across the site (not unique
  // rules — the same rule failing on 5 elements counts as 5), matching what
  // a user would see if they expanded every violation's affected-elements list.
  failedChecks: number;
}

export function computeAccessibilityScore(pages: PageContent[]): AccessibilityScoreResult {
  let weightedPasses = 0;
  let weightedFailures = 0;
  let failedChecks = 0;
  for (const page of pages) {
    weightedPasses += page.axePassesCount;
    for (const v of page.axeViolations) {
      weightedFailures += IMPACT_WEIGHT[v.impact ?? 'moderate'] ?? 2;
      failedChecks += v.nodes.length;
    }
  }
  const total = weightedPasses + weightedFailures;
  return { score: total > 0 ? Math.round((weightedPasses / total) * 100) : null, failedChecks };
}

// ─── SEO & AI-search ──────────────────────────────────────────────────────────
// Deterministic, no AI call — same fields the crawler already parses via cheerio.

export function extractSeoFindings(page: PageContent): MonitorFinding[] {
  const findings: MonitorFinding[] = [];
  const add = (ruleId: string, title: string, description: string, priority: MonitorFinding['priority'], helpUrl = '') => {
    findings.push({
      ruleId: `seo-${ruleId}`, title, description, helpUrl, priority,
      pageUrl: page.url, nodeHtml: '', nodeTarget: '', category: 'seo',
    });
  };

  if (!page.title.trim()) {
    add('missing-title', 'Missing page title', 'This page has no <title> tag — hurts both search rankings and AI-search citability.', 'high');
  } else if (page.title.length > 60) {
    add('title-too-long', 'Page title is too long', `Title is ${page.title.length} characters — search engines typically truncate past ~60. Title: "${page.title}"`, 'low');
  }

  if (!page.metaDescription.trim()) {
    add('missing-meta-description', 'Missing meta description', 'No meta description found — search engines will auto-generate a snippet instead of using your own copy.', 'medium');
  } else if (page.metaDescription.length > 160) {
    add('meta-description-too-long', 'Meta description is too long', `Description is ${page.metaDescription.length} characters — likely to be truncated in search results.`, 'low');
  }

  if (!page.canonicalUrl) {
    add('missing-canonical', 'Missing canonical URL', 'No canonical tag found — can cause duplicate-content issues across URL variants.', 'low');
  }

  if (page.h1s.length === 0) {
    add('missing-h1', 'Missing H1 heading', 'This page has no H1 — a single clear heading helps both SEO and AI-search summarization.', 'medium');
  } else if (page.h1s.length > 1) {
    add('multiple-h1', 'Multiple H1 headings', `Found ${page.h1s.length} H1 tags — search engines prefer a single, clear H1 per page.`, 'low');
  }

  if (!page.ogTitle || !page.ogDescription || !page.ogImage) {
    add('missing-og-tags', 'Incomplete Open Graph tags', 'Missing og:title, og:description, or og:image — link previews on social/chat apps and AI crawlers will look broken or generic.', 'medium');
  }

  if (!page.hasSchemaMarkup) {
    add('missing-schema', 'No structured data (schema.org)', 'No JSON-LD structured data found — limits rich results in Google and makes it harder for AI search engines to understand this page.', 'low');
  }

  if (page.wordCount < 150) {
    add('thin-content', 'Thin content', `This page has only ${page.wordCount} words — thin pages tend to rank poorly and rarely get cited by AI search.`, 'medium');
  }

  if (!page.hasFavicon) {
    add('missing-favicon', 'Missing favicon', 'No favicon found — a small polish issue that affects browser tabs and bookmarks.', 'low');
  }

  return findings;
}

// ─── Legal / privacy compliance ───────────────────────────────────────────────
// Site-level, not per-page — checked once across every crawled page's links/scripts.

const COOKIE_CONSENT_PROVIDERS = /cookiebot|onetrust|cookieyes|termly|iubenda|cookieconsent|cookie-consent|osano|usercentrics|trustarc/i;

// Scripts that set non-essential (analytics/advertising) cookies — the actual
// trigger for most regions' consent requirement. Privacy-first tools like
// Plausible/Matomo/Fathom are deliberately excluded: they're commonly
// cookieless, so flagging them here would just reintroduce a false positive.
const TRACKING_SCRIPTS = /google-analytics|googletagmanager|gtag\.js|doubleclick|facebook\.net|connect\.facebook|fbevents|hotjar|mixpanel|segment\.(io|com)|clarity\.ms|tiktok|licdn\.com|linkedin\.com\/px|hubspot|adroll|criteo/i;

export function extractLegalFindings(pages: PageContent[]): MonitorFinding[] {
  if (pages.length === 0) return [];
  const findings: MonitorFinding[] = [];
  const landingPage = pages[0].url;
  const allLinks = pages.flatMap((p) => p.links);
  const allScripts = new Set(pages.flatMap((p) => p.thirdPartyScripts));

  const hasPrivacy = allLinks.some((l) => /privacy/i.test(l.href) || /privacy/i.test(l.text));
  const hasTerms = allLinks.some((l) => /terms|\btos\b/i.test(l.href) || /terms/i.test(l.text));
  const hasCookieConsent = [...allScripts].some((d) => COOKIE_CONSENT_PROVIDERS.test(d));
  const trackingScriptsFound = [...allScripts].filter((d) => TRACKING_SCRIPTS.test(d));

  const add = (ruleId: string, title: string, description: string, priority: MonitorFinding['priority']) => {
    findings.push({
      ruleId: `legal-${ruleId}`, title, description, helpUrl: '', priority,
      pageUrl: landingPage, nodeHtml: '', nodeTarget: '', category: 'legal',
    });
  };

  if (!hasPrivacy) {
    add('missing-privacy-policy', 'No privacy policy link found', `Could not find a link to a privacy policy across the ${pages.length} scanned page${pages.length > 1 ? 's' : ''}. Most regions (GDPR, CCPA) require one to be easily accessible.`, 'high');
  }
  if (!hasTerms) {
    add('missing-terms', 'No terms of service link found', `Could not find a link to terms of service / terms of use across the ${pages.length} scanned page${pages.length > 1 ? 's' : ''}.`, 'medium');
  }
  // Only flag missing consent when the site actually loads a known
  // analytics/ad tracker — previously this fired on every site without a
  // *named* consent provider, including ones with no tracking scripts at
  // all, i.e. nothing that would legally require consent in the first place.
  if (trackingScriptsFound.length > 0 && !hasCookieConsent) {
    add('missing-cookie-consent', 'No cookie consent banner detected', `Detected tracking script${trackingScriptsFound.length > 1 ? 's' : ''} (${trackingScriptsFound.join(', ')}) but no recognized cookie-consent provider. Most regions (GDPR, CCPA) require explicit consent before setting non-essential cookies like these.`, 'medium');
  }

  return findings;
}

// Broken-link checking now lives entirely in apps/worker (a long-running
// process, not a serverless function) — a real site-wide crawl needs no time
// limit to be thorough, which this route's 120s maxDuration can't offer. The
// scan route just queues a monitor_scan_jobs row; see apps/worker/src/index.ts
// and apps/worker/src/crawler.ts for the actual crawl + check logic.

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

// ─── AI-based checks (content quality, brand consistency, custom) ────────────
// One batched Claude call per check, across up to a handful of pages, rather
// than one call per page — keeps added latency/cost bounded and fits inside
// the scan route's maxDuration (see api/monitor/[projectId]/scan/route.ts).
// Never throws: a failed/malformed AI call must not fail the whole scan.

function getAiClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const AI_CHECK_MAX_PAGES = 8;
const AI_CHECK_BODY_CHARS = 1_200;
const VALID_PRIORITIES: MonitorFinding['priority'][] = ['critical', 'high', 'medium', 'low'];

interface AiPageFinding {
  pageUrl: string;
  title: string;
  description: string;
  priority: string;
}

function extractJsonArray(text: string): AiPageFinding[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function runAiPageCheck(
  pages: PageContent[],
  category: MonitorCategory,
  ruleIdPrefix: string,
  systemPrompt: string
): Promise<MonitorFinding[]> {
  if (pages.length === 0) return [];
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(`[monitor] Skipping ${category} check — ANTHROPIC_API_KEY not set`);
    return [];
  }

  const sample = pages.slice(0, AI_CHECK_MAX_PAGES);
  const validUrls = new Set(sample.map((p) => p.url));
  const prompt = sample
    .map((p) => `URL: ${p.url}\nTitle: ${p.title}\nContent: ${p.bodyText.slice(0, AI_CHECK_BODY_CHARS)}`)
    .join('\n\n---\n\n');

  try {
    const response = await getAiClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    const raw = extractJsonArray(text);
    const findings: MonitorFinding[] = [];
    for (const item of raw) {
      if (!item || typeof item.title !== 'string' || typeof item.description !== 'string') continue;
      const pageUrl = validUrls.has(item.pageUrl) ? item.pageUrl : sample[0].url;
      const priority = VALID_PRIORITIES.includes(item.priority as MonitorFinding['priority'])
        ? (item.priority as MonitorFinding['priority'])
        : 'medium';
      const title = item.title.slice(0, 100);
      findings.push({
        ruleId: `${ruleIdPrefix}-${hashString(pageUrl + title)}`,
        title,
        description: item.description.slice(0, 300),
        helpUrl: '',
        priority,
        pageUrl,
        nodeHtml: '',
        nodeTarget: '',
        category,
      });
    }
    return findings;
  } catch (err) {
    console.error(`[monitor] ${category} AI check failed:`, err);
    return [];
  }
}

const CONTENT_QUALITY_SYSTEM_PROMPT = `You review website page content for quality issues — typos, grammar mistakes, awkward phrasing, unclear or confusing copy.

You'll be given one or more pages, each with a URL, title, and text content.

Return ONLY a JSON array of findings: [{"pageUrl": "...", "title": "short issue title, max 80 chars", "description": "what's wrong and a quick suggestion, max 250 chars", "priority": "critical"|"high"|"medium"|"low"}].

Only report real, specific issues you can point to in the given text — do not invent generic advice. If a page has no notable issues, don't include an entry for it. Typos and clear grammar errors are "high" priority; awkward phrasing or unclear copy is "medium" or "low". Return an empty array [] if nothing is worth flagging.`;

const BRAND_CONSISTENCY_SYSTEM_PROMPT = `You review a website's pages for brand/voice consistency — inconsistent product naming or capitalization, mismatched tone (formal vs casual) across pages, inconsistent terminology for the same concept, or inconsistent capitalization of headings/buttons.

You'll be given several pages, each with a URL, title, and text content — compare across them, not just within one page.

Return ONLY a JSON array of findings: [{"pageUrl": "...", "title": "short issue title, max 80 chars", "description": "what's inconsistent and where, max 250 chars", "priority": "critical"|"high"|"medium"|"low"}].

Only report real inconsistencies you can point to across the given pages — do not invent generic branding advice. Most findings should be "medium" or "low" priority; use "high" only for something a visitor would clearly notice as unprofessional. Return an empty array [] if nothing is worth flagging.`;

export async function extractContentQualityFindings(pages: PageContent[]): Promise<MonitorFinding[]> {
  return runAiPageCheck(pages, 'content_quality', 'content', CONTENT_QUALITY_SYSTEM_PROMPT);
}

export async function extractBrandConsistencyFindings(pages: PageContent[]): Promise<MonitorFinding[]> {
  return runAiPageCheck(pages, 'brand_consistency', 'brand', BRAND_CONSISTENCY_SYSTEM_PROMPT);
}

export async function extractCustomCheckFindings(pages: PageContent[], customPrompt: string): Promise<MonitorFinding[]> {
  const trimmed = customPrompt.trim();
  if (!trimmed) return [];
  const systemPrompt = `You review website pages against a custom check a site owner asked for.

Custom check to run: "${trimmed}"

You'll be given one or more pages, each with a URL, title, and text content.

Return ONLY a JSON array of findings: [{"pageUrl": "...", "title": "short issue title, max 80 chars", "description": "what you found, max 250 chars", "priority": "critical"|"high"|"medium"|"low"}]. Only report real issues relevant to the custom check above — do not invent generic advice. Return an empty array [] if nothing matches.`;
  return runAiPageCheck(pages, 'custom', 'custom', systemPrompt);
}

const PRIORITY_RANK: Record<MonitorFinding['priority'], number> = { critical: 3, high: 2, medium: 1, low: 0 };

export function worsePriority(a: MonitorFinding['priority'], b: MonitorFinding['priority']): MonitorFinding['priority'] {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b;
}

export function wcagTagsForLevel(level: 'A' | 'AA' | 'AAA'): string[] {
  const a = ['wcag2a', 'wcag21a', 'wcag22a'];
  const aa = [...a, 'wcag2aa', 'wcag21aa', 'wcag22aa'];
  if (level === 'A') return a;
  if (level === 'AA') return aa;
  return [...aa, 'wcag2aaa'];
}
