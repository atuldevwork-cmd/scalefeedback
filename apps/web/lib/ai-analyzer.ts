import OpenAI from 'openai';
import type { PageContent, AxeViolation } from './crawler';

export interface ScanIssue {
  title: string;
  description: string;
  type: 'bug' | 'suggestion' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'accessibility' | 'seo' | 'ux' | 'content' | 'technical';
  view: 'desktop' | 'mobile';
  pageUrl: string;
  section: string;
}

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `You are a web UX and content auditor. You receive page screenshots (desktop 1440px + mobile 375px) and page metadata to identify VISUAL and CONTENT issues only.

IMPORTANT: Accessibility violations (color contrast ratios, ARIA labels, form labels, keyboard navigation, alt text) and SEO checks (title, meta, OG tags, canonical, H1/H2) are handled by automated tools. Do NOT report those — focus only on what YOU can uniquely see in the screenshots.

Your scope:

1. UX & VISUAL DESIGN (category: "ux") — requires screenshot inspection
   - Primary CTA button is not visually prominent, hard to find, or has no clear label
   - Hero section is cluttered, confusing, or lacks a clear value proposition
   - Poor visual hierarchy: everything looks the same size/weight, nothing stands out
   - Navigation items are confusingly labelled or the menu structure is unclear
   - Important content buried far below the fold with no visual cue to scroll
   - Inconsistent spacing, alignment, or layout that looks broken or unprofessional
   - Form has too many fields with no visual grouping or progress indication
   - Overlapping or clipped elements visible in the screenshot
   ONLY report issues you can clearly see in the screenshot.

2. MOBILE RESPONSIVENESS (category: "ux", view: "mobile") — requires mobile screenshot
   - Content overflowing or cut off at the right edge
   - Text too small to read comfortably on mobile
   - Tap targets (buttons, links) too small or too close together
   - Horizontal scrollbar visible or layout broken on 375px
   - Navigation completely collapses and loses usability on mobile
   ONLY report issues clearly visible in the mobile screenshot.

3. TECHNICAL (category: "technical") — console errors only
   - Console errors indicating broken resources or JavaScript failures (from the metadata)
   - Broken or missing images visible in the screenshot (the image placeholder/broken icon is visible)

4. CONTENT (category: "content")
   - Placeholder text ("Lorem ipsum") visible in the screenshot
   - Outdated copyright year visible in the footer
   - Obvious typos or grammatical errors visible in the screenshot
   - Generic or unhelpful error messages visible

Rules:
- USE the screenshots as your primary source — only report what you can DEFINITELY SEE
- Be specific: name the section or element (e.g. "Hero CTA button", "Mobile navigation", "Pricing section footer")
- Do NOT report hypothetical or potential issues — only real, confirmed, visible issues
- Return ONLY a valid JSON array, no prose or markdown
- If truly no issues, return []

Do NOT report (handled by automated tools):
- Alt text / image accessibility
- Color contrast ratios or WCAG compliance
- ARIA attributes, keyboard navigation, screen reader issues
- Form label accessibility
- HTML lang attribute, viewport meta
- Title, meta description, H1, H2, OG tags, canonical URL, Twitter Card
- Missing favicon
- HTTP status codes
- Any SEO signals

Confidence rule: before including any issue, ask "Can I clearly see this in the screenshot?" If not a definite YES — omit it.
Do NOT use words like "could", "might", "may", "appears to" — only report confirmed issues.
NEVER report contrast or text readability unless the text is genuinely illegible (not just a different shade).`;


function summarisePage(page: PageContent): string {
  const missingAlt = page.images.filter((i) => !i.alt).length;
  const vagueLinks = page.links.filter((l) =>
    /^(click here|here|read more|more|learn more|this|link)$/i.test(l.text.trim())
  );

  return [
    `URL: ${page.url}`,
    `HTTP status: ${page.statusCode}`,
    `Title: ${page.title || '(MISSING)'} [length: ${page.title.length}]`,
    `Meta description: ${page.metaDescription || '(MISSING)'} [length: ${page.metaDescription.length}]`,
    `HTML lang attribute: ${page.lang || '(MISSING)'}`,
    `Viewport meta: ${page.hasViewportMeta ? 'present' : 'MISSING'}`,
    `Canonical URL: ${page.canonicalUrl || '(MISSING)'}`,
    `Open Graph title: ${page.ogTitle || '(MISSING)'}`,
    `Open Graph description: ${page.ogDescription || '(MISSING)'}`,
    `Open Graph image: ${page.ogImage || '(MISSING)'}`,
    `Twitter Card: ${page.twitterCard || '(MISSING)'}`,
    `Favicon: ${page.hasFavicon ? 'present' : 'MISSING — no <link rel="icon"> found in HTML'}`,
    `H1 count: ${page.h1s.length} — ${page.h1s.slice(0, 3).join(' | ') || '(none)'}`,
    `H2 count: ${page.h2s.length} — ${page.h2s.slice(0, 4).join(' | ') || '(none)'}`,
    `Images: ${page.images.length} total, ${missingAlt} missing alt text`,
    `Vague link text: ${vagueLinks.length} (e.g. ${vagueLinks.slice(0, 3).map((l) => `"${l.text}"`).join(', ') || 'none'})`,
    `Word count (approximate): ${page.wordCount}`,
    `Form issues: ${page.formIssues.length > 0 ? page.formIssues.join('; ') : 'none'}`,
    `Console errors: ${page.consoleErrors.length > 0 ? page.consoleErrors.slice(0, 5).join(' | ') : 'none'}`,
    `Page body text (truncated): ${page.bodyText.slice(0, 1_200)}`,
  ].join('\n');
}

function seoAudit(page: PageContent): ScanIssue[] {
  const issues: ScanIssue[] = [];
  const base = { type: 'suggestion' as const, category: 'seo' as const, view: 'desktop' as const, pageUrl: page.url, section: 'Page-level' };

  if (!page.title) {
    issues.push({ ...base, title: 'Missing page title', description: 'The <title> tag is empty or missing. This is critical for SEO and browser tab display.', priority: 'critical' });
  } else if (page.title.length > 60) {
    issues.push({ ...base, title: 'Title exceeds 60 characters', description: `Title is ${page.title.length} chars — gets truncated in search results. Keep it under 60.`, priority: 'low' });
  } else if (page.title.length < 10) {
    issues.push({ ...base, title: 'Title too short', description: `Title is only ${page.title.length} chars. A descriptive title improves CTR and SEO.`, priority: 'medium' });
  }

  if (!page.metaDescription) {
    issues.push({ ...base, title: 'Missing meta description', description: 'No meta description found. Search engines use this as the snippet in results — critical for CTR.', priority: 'high' });
  } else {
    if (page.metaDescription.length > 160) {
      issues.push({ ...base, title: 'Meta description too long', description: `Meta description is ${page.metaDescription.length} chars — gets truncated at 160. Shorten it.`, priority: 'medium' });
    } else if (page.metaDescription.length < 50) {
      issues.push({ ...base, title: 'Meta description too short', description: `Meta description is only ${page.metaDescription.length} chars. Aim for 120–160 chars with a clear value proposition.`, priority: 'medium' });
    }
  }

  if (page.h1s.length === 0) {
    issues.push({ ...base, title: 'Missing H1 heading', description: 'No H1 found on the page. The H1 is the primary keyword signal for search engines.', priority: 'high' });
  } else if (page.h1s.length > 1) {
    issues.push({ ...base, title: 'Multiple H1 headings', description: `Found ${page.h1s.length} H1 tags. Only one H1 per page is recommended for clear SEO hierarchy.`, priority: 'medium' });
  }

  if (page.h2s.length < 2 && page.wordCount > 300) {
    issues.push({ ...base, title: 'Too few H2 headings', description: `Only ${page.h2s.length} H2 found. Use H2s to structure long-form content and help search engines understand topics.`, priority: 'low' });
  }

  if (!page.ogTitle) issues.push({ ...base, title: 'Missing Open Graph title', description: 'No og:title meta tag. This controls how the page appears when shared on social media.', priority: 'low' });
  if (!page.ogDescription) issues.push({ ...base, title: 'Missing Open Graph description', description: 'No og:description meta tag. Required for rich previews on Facebook, LinkedIn, WhatsApp.', priority: 'low' });
  if (!page.ogImage) issues.push({ ...base, title: 'Missing Open Graph image', description: 'No og:image meta tag. Without it, social shares show no image, drastically reducing engagement.', priority: 'medium' });
  if (!page.twitterCard) issues.push({ ...base, title: 'Missing Twitter Card meta tag', description: 'No twitter:card meta tag. Tweets linking this page will show plain text with no rich preview.', priority: 'low' });
  if (!page.canonicalUrl) issues.push({ ...base, title: 'Missing canonical URL', description: 'No <link rel="canonical"> found. This can cause duplicate content issues if the page is accessible via multiple URLs.', priority: 'medium' });
  if (!page.lang) issues.push({ ...base, title: 'Missing HTML lang attribute', description: 'The <html> tag has no lang attribute. Required for accessibility and helps search engines identify the page language.', priority: 'medium', category: 'accessibility' });
  if (!page.hasFavicon) issues.push({ ...base, title: 'Missing favicon', description: 'No favicon found in HTML. A favicon improves brand recognition in browser tabs and bookmarks.', priority: 'low', category: 'technical' });

  const isFilenameAlt = (alt: string) => /^[\w\-]+\.(png|jpg|jpeg|svg|webp|gif)$/i.test(alt.trim()) || /^(image|img|photo|picture|screenshot|hero|banner|icon|logo)[\-_]?\d*$/i.test(alt.trim());
  const missingAlt = page.images.filter((i) => !i.alt || isFilenameAlt(i.alt)).length;
  if (missingAlt > 0) {
    issues.push({ ...base, title: `${missingAlt} image${missingAlt > 1 ? 's' : ''} missing descriptive alt text`, description: `${missingAlt} image(s) have no alt text or use a filename as alt (e.g. "hero-featured-image"). Descriptive alt text is required for accessibility and image SEO.`, priority: missingAlt > 3 ? 'high' : 'medium', category: 'accessibility' });
  }

  const vagueLinks = page.links.filter((l) => /^(click here|here|read more|more|learn more|this|link)$/i.test(l.text.trim()));
  if (vagueLinks.length > 0) {
    issues.push({ ...base, title: 'Vague link anchor text', description: `${vagueLinks.length} link(s) use generic text like "click here" or "read more". Descriptive anchor text improves SEO.`, priority: 'low' });
  }

  if (page.wordCount < 300) {
    issues.push({ ...base, title: 'Thin content — low word count', description: `Page has ~${page.wordCount} words. Pages under 300 words are considered thin content and may rank poorly.`, priority: 'medium' });
  }

  if (page.statusCode >= 400) {
    issues.push({ ...base, title: `HTTP ${page.statusCode} error`, description: `Page returned a ${page.statusCode} status code. This page is not indexable by search engines.`, priority: 'critical', type: 'bug', category: 'technical' });
  }

  return issues;
}

// Rule IDs already covered by seoAudit — skip from axe results to avoid duplication
const SEO_AUDIT_AXE_RULES = new Set([
  'html-has-lang',       // covered: Missing HTML lang attribute
  'image-alt',           // covered: images missing descriptive alt text
  'meta-viewport',       // covered: hasViewportMeta check
]);

const AXE_IMPACT_PRIORITY: Record<string, ScanIssue['priority']> = {
  critical: 'critical',
  serious: 'high',
  moderate: 'medium',
  minor: 'low',
};

function axeAudit(page: PageContent): ScanIssue[] {
  if (!page.axeViolations?.length) return [];
  const issues: ScanIssue[] = [];

  for (const violation of page.axeViolations) {
    if (SEO_AUDIT_AXE_RULES.has(violation.id)) continue;

    const nodeCount = violation.nodes.length;
    const firstNode = violation.nodes[0];

    // Build a readable section from the first failing element's selector
    let section = 'Page-level';
    if (firstNode?.target?.length) {
      const raw = String(firstNode.target[0]);
      section = raw.length > 60 ? raw.slice(0, 57) + '...' : raw;
    }

    const affectedSuffix = nodeCount > 1 ? ` (${nodeCount} elements)` : '';
    const title = `${violation.help}${affectedSuffix}`.slice(0, 80);

    const failureSummary = firstNode?.failureSummary ?? '';
    const description = (failureSummary
      ? `WCAG/${violation.id}: ${failureSummary}`
      : `WCAG/${violation.id}: ${violation.description}`
    ).slice(0, 200);

    issues.push({
      title,
      description,
      type: 'bug',
      priority: AXE_IMPACT_PRIORITY[violation.impact ?? 'minor'] ?? 'low',
      category: 'accessibility',
      view: 'desktop',
      section,
      pageUrl: page.url,
    });
  }

  return issues;
}

type ImageBlock = {
  type: 'image_url';
  image_url: { url: string };
};
type TextBlock = { type: 'text'; text: string };
type ContentBlock = ImageBlock | TextBlock;

export async function analyzePages(pages: PageContent[]): Promise<ScanIssue[]> {
  const allIssues: ScanIssue[] = [];

  for (const page of pages) {
    // Deterministic audits — 100% reliable, no AI variability
    allIssues.push(...seoAudit(page));
    allIssues.push(...axeAudit(page));

    const textContent = `Analyze this page's VISUAL and CONTENT quality using the screenshots. Return a JSON array of UX, mobile responsiveness, technical, and content issues you can CLEARLY SEE. Each object must have exactly:
- "title": concise issue name, max 80 chars
- "description": what the problem is and why it matters, max 200 chars
- "type": "bug" | "suggestion" | "other"
- "priority": "low" | "medium" | "high" | "critical"
- "category": "ux" | "content" | "technical" — do NOT use "seo" or "accessibility" (those are handled by automated tools)
- "view": "mobile" if only visible on the mobile screenshot (375px), otherwise "desktop"
- "section": specific page section or element (e.g. "Hero section", "Navigation bar", "Pricing card", "Footer", "CTA button")

Screenshots: first image = desktop (1440px), second image = mobile (375px).
Examine mobile screenshot for: overflowing content, tiny text, cramped tap targets, broken layout.
Examine desktop screenshot for: cluttered layout, confusing navigation, poor visual hierarchy, broken elements.

DO NOT report: alt text, color contrast ratios, ARIA, form labels, HTML lang, viewport meta, title/meta/H1/H2/OG/canonical, favicon, HTTP errors — all handled by automated tools.

Page metadata (for context only — do not re-report SEO/accessibility data from this):
${summarisePage(page)}

Return ONLY the JSON array.`;

    const messageContent: ContentBlock[] = [];

    const hasScreenshots = !!(page.screenshotBuffer || page.mobileScreenshotBuffer);

    if (page.screenshotBuffer) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${page.screenshotBuffer.toString('base64')}` },
      });
    }

    if (page.mobileScreenshotBuffer) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${page.mobileScreenshotBuffer.toString('base64')}` },
      });
    }

    const analysisText = hasScreenshots
      ? textContent
      : textContent.replace(
          'Screenshots: first image = desktop (1440px), second image = mobile (375px).\nExamine mobile screenshot for: overflowing content, tiny text, cramped tap targets, broken layout.\nExamine desktop screenshot for: cluttered layout, confusing navigation, poor visual hierarchy, broken elements.',
          'No screenshots available — analyze based on HTML metadata only. Set "view" to "desktop" for all issues.'
        );

    messageContent.push({ type: 'text', text: analysisText });

    try {
      const response = await getClient().chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 6_000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: messageContent },
        ],
      });

      const text = response.choices[0].message.content?.trim() ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        title?: string;
        description?: string;
        type?: string;
        priority?: string;
        category?: string;
        view?: string;
        section?: string;
      }>;

      const validTypes = new Set(['bug', 'suggestion', 'other']);
      const validPriorities = new Set(['low', 'medium', 'high', 'critical']);
      // AI is NOT allowed to produce seo or accessibility — those come from deterministic audits
      const validCategories = new Set(['ux', 'content', 'technical']);

      for (const issue of parsed) {
        if (!issue.title || !issue.description) continue;
        // Drop SEO and accessibility — handled deterministically by seoAudit() and axeAudit()
        if (issue.category === 'seo' || issue.category === 'accessibility') continue;
        allIssues.push({
          title: String(issue.title).slice(0, 80),
          description: String(issue.description).slice(0, 200),
          type: validTypes.has(issue.type ?? '') ? (issue.type as ScanIssue['type']) : 'other',
          priority: validPriorities.has(issue.priority ?? '') ? (issue.priority as ScanIssue['priority']) : 'medium',
          category: validCategories.has(issue.category ?? '') ? (issue.category as ScanIssue['category']) : 'ux',
          view: issue.view === 'mobile' ? 'mobile' : 'desktop',
          section: issue.section ? String(issue.section).slice(0, 80) : 'Page-level',
          pageUrl: page.url,
        });
      }
    } catch (err) {
      console.error(`AI analysis failed for ${page.url}:`, err);
    }
  }

  // Deduplicate by normalised title (keep first occurrence)
  const seen = new Set<string>();
  return allIssues.filter((issue) => {
    const key = issue.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
