import OpenAI from 'openai';
import type { PageContent } from './crawler';

export interface ScanIssue {
  title: string;
  description: string;
  type: 'bug' | 'suggestion' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'accessibility' | 'seo' | 'ux' | 'content' | 'technical';
  view: 'desktop' | 'mobile';
  pageUrl: string;
}

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `You are a web quality auditor. You receive page metadata AND screenshots (desktop 1440px + mobile 375px) to identify real, actionable issues.

Focus on ALL of these areas:

1. ACCESSIBILITY (category: "accessibility")
   - Images missing alt text
   - Form inputs without visible labels
   - Missing html lang attribute
   - Missing viewport meta tag
   - Low colour contrast between text and background (visible in screenshot)
   - Links with no discernible text
   - Buttons with no accessible label
   - Missing ARIA landmarks or roles where needed

2. SEO (category: "seo")
   - Missing or empty <title>
   - Missing meta description
   - Zero H1 tags or multiple H1 tags
   - Title longer than 60 characters or shorter than 10 characters
   - Meta description longer than 160 characters or shorter than 50 characters
   - Meta description missing a call-to-action or keyword
   - H1 text does not reflect the page topic or is too generic
   - H2 headings missing or too few (less than 2) for long-form pages
   - Images missing alt text (SEO perspective — search engines can't index)
   - Missing canonical tag (duplicate content risk)
   - Missing Open Graph tags (og:title, og:description, og:image) for social sharing
   - Missing Twitter Card meta tags
   - Vague link anchor text ("click here", "read more") hurts SEO
   - Page body text too short (thin content — below 300 words)
   - Missing structured data / schema markup for key page types
   IMPORTANT: ALWAYS check for SEO issues using the metadata provided and report every SEO issue found, even minor ones.

3. UX & VISUAL DESIGN (category: "ux") — REQUIRES screenshot inspection
   Look at the desktop screenshot carefully and report issues such as:
   - Primary CTA button is not visually prominent, hard to find, or has no clear label
   - Hero / above-the-fold section is cluttered, confusing, or has no clear value proposition
   - Poor visual hierarchy: everything looks the same size/weight, nothing stands out
   - Text is too small to read comfortably (body text appears very small in the screenshot)
   - Low contrast text that is hard to read (even if technically passing WCAG — report if it looks hard to read in the screenshot)
   - Navigation menu is hard to understand or items are ambiguously labelled
   - Important content is buried far below the fold with no visual cue
   - Inconsistent spacing, alignment, or layout that looks broken or unprofessional
   - Form has too many fields with no visual grouping or progress indication
   - Overlapping or clipped elements visible in the screenshot
   IMPORTANT: When screenshots are provided you MUST report at least two "ux" category issues based on what you actually see.

4. MOBILE RESPONSIVENESS (category: "ux", view: "mobile") — REQUIRES mobile screenshot inspection
   - Content overflowing or cut off at edges
   - Text too small to read on mobile
   - Tap targets (buttons, links) too small or too close together
   - Horizontal scroll required
   - Layout completely broken on 375px width
   IMPORTANT: When a mobile screenshot is provided you MUST report at least one mobile responsiveness issue.

5. TECHNICAL (category: "technical")
   - HTTP error status codes (4xx, 5xx)
   - Console errors indicating broken resources or JavaScript failures
   - Missing favicon
   - Slow or render-blocking resources indicated by console errors

6. CONTENT (category: "content")
   - Placeholder text ("Lorem ipsum") still present
   - Broken or missing images visible in the screenshot
   - Outdated copyright year
   - Typos or grammatical errors visible in the screenshot
   - Generic or unhelpful error messages

Rules:
- USE the screenshots — do not rely only on HTML metadata
- Be specific: name the element, section, or content causing the problem
- Only report genuine issues visible in the screenshot or in the metadata, not hypothetical concerns
- Return 8–15 issues per page, spanning ALL categories (accessibility, seo, ux, technical, content)
- You MUST include SEO issues if any are found in the metadata — do not skip them
- Return ONLY a valid JSON array, no prose or markdown
- If truly no issues found, return []`;

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

type ImageBlock = {
  type: 'image_url';
  image_url: { url: string };
};
type TextBlock = { type: 'text'; text: string };
type ContentBlock = ImageBlock | TextBlock;

export async function analyzePages(pages: PageContent[]): Promise<ScanIssue[]> {
  const allIssues: ScanIssue[] = [];

  for (const page of pages) {
    const textContent = `Analyze this page thoroughly and return a JSON array of ALL issues found. Target 8–15 issues spanning every category. Each issue object must have exactly these keys:
- "title": concise issue name, max 80 chars
- "description": what the problem is and why it matters, max 200 chars
- "type": one of "bug" | "suggestion" | "other"
- "priority": one of "low" | "medium" | "high" | "critical"
- "category": one of "accessibility" | "seo" | "ux" | "content" | "technical"
- "view": "mobile" if the issue is only visible/relevant on the mobile screenshot (375px), otherwise "desktop"

Screenshots provided above: first image is desktop view (1440px wide), second image is mobile view (375px wide).
Examine the mobile screenshot for responsiveness issues: overflowing content, tiny text, cramped tap targets, broken layout.
Examine the desktop screenshot for visual/UI issues: cluttered layout, contrast problems, confusing navigation.
Set "view" to "mobile" ONLY when the issue is specifically visible on the mobile screenshot (e.g. layout break, overflow, tiny tap target). For SEO, missing meta tags, console errors, and general issues use "desktop".

IMPORTANT: Check ALL SEO signals in the metadata below (title, meta description, H1/H2, Open Graph, canonical, link text, content length) and report every SEO issue found.

Page metadata:
${summarisePage(page)}

Return ONLY the JSON array. Do not truncate — include every issue found.`;

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
          'Screenshots provided above: first image is desktop view (1440px wide), second image is mobile view (375px wide).\nExamine the mobile screenshot for responsiveness issues: overflowing content, tiny text, cramped tap targets, broken layout.\nExamine the desktop screenshot for visual/UI issues: cluttered layout, contrast problems, confusing navigation.\nSet "view" to "mobile" ONLY when the issue is specifically visible on the mobile screenshot (e.g. layout break, overflow, tiny tap target). For SEO, missing meta tags, console errors, and general issues use "desktop".',
          'No screenshots available — analyze based on HTML metadata only. Set "view" to "desktop" for all issues.'
        );

    messageContent.push({ type: 'text', text: analysisText });

    try {
      const response = await getClient().chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 3_000,
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
      }>;

      const validTypes = new Set(['bug', 'suggestion', 'other']);
      const validPriorities = new Set(['low', 'medium', 'high', 'critical']);
      const validCategories = new Set(['accessibility', 'seo', 'ux', 'content', 'technical']);

      for (const issue of parsed) {
        if (!issue.title || !issue.description) continue;
        allIssues.push({
          title: String(issue.title).slice(0, 80),
          description: String(issue.description).slice(0, 200),
          type: validTypes.has(issue.type ?? '') ? (issue.type as ScanIssue['type']) : 'other',
          priority: validPriorities.has(issue.priority ?? '') ? (issue.priority as ScanIssue['priority']) : 'medium',
          category: validCategories.has(issue.category ?? '') ? (issue.category as ScanIssue['category']) : 'technical',
          view: issue.view === 'mobile' ? 'mobile' : 'desktop',
          pageUrl: page.url,
        });
      }
    } catch (err) {
      console.error(`AI analysis failed for ${page.url}:`, err);
    }
  }

  return allIssues;
}
