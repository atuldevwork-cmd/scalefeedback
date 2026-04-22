import Anthropic from '@anthropic-ai/sdk';
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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a web quality auditor. You receive page metadata AND screenshots (desktop 1440px + mobile 375px) to identify real, actionable issues.

Focus on ALL of these areas:
- Accessibility: missing alt text on images, unlabeled inputs, missing html lang attribute, no viewport meta, low contrast text visible in screenshots
- SEO: missing or empty title, missing meta description, multiple H1 tags, no H1, very long title (>60 chars)
- UX & Visual UI: cluttered layout, confusing navigation, poor visual hierarchy, hard to read text, overlapping elements (inspect the desktop screenshot)
- Mobile responsiveness: content overflowing or cut off, text too small to read, tap targets too small or cramped, layout breaking, horizontal scroll needed (inspect the mobile screenshot carefully)
- Technical: HTTP error status codes, console errors indicating broken resources

Rules:
- USE the screenshots to identify visual and mobile issues — don't rely on HTML data alone
- Carefully examine the mobile screenshot (375px wide) for layout breaks, overflow, tiny text, and cramped buttons
- Only report genuine issues, not stylistic preferences
- Be specific — name the element or content causing the problem
- Return 3–6 issues per page, spread across different categories when possible
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
    `Title: ${page.title || '(missing)'}`,
    `Meta description: ${page.metaDescription || '(missing)'}`,
    `HTML lang attribute: ${page.lang || '(missing)'}`,
    `Viewport meta: ${page.hasViewportMeta ? 'present' : 'MISSING'}`,
    `H1 count: ${page.h1s.length} — ${page.h1s.slice(0, 3).join(' | ') || '(none)'}`,
    `H2 count: ${page.h2s.length} — ${page.h2s.slice(0, 4).join(' | ') || '(none)'}`,
    `Images: ${page.images.length} total, ${missingAlt} missing alt text`,
    `Vague link text: ${vagueLinks.length} (e.g. ${vagueLinks.slice(0, 3).map((l) => `"${l.text}"`).join(', ') || 'none'})`,
    `Form issues: ${page.formIssues.length > 0 ? page.formIssues.join('; ') : 'none'}`,
    `Console errors: ${page.consoleErrors.length > 0 ? page.consoleErrors.slice(0, 5).join(' | ') : 'none'}`,
    `Page body text (truncated): ${page.bodyText.slice(0, 1_200)}`,
  ].join('\n');
}

type ImageBlock = {
  type: 'image';
  source: { type: 'base64'; media_type: 'image/png'; data: string };
};
type TextBlock = { type: 'text'; text: string };
type ContentBlock = ImageBlock | TextBlock;

export async function analyzePages(pages: PageContent[]): Promise<ScanIssue[]> {
  const allIssues: ScanIssue[] = [];

  for (const page of pages) {
    const textContent = `Analyze this page and return a JSON array of issues. Each issue object must have exactly these keys:
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

Page metadata:
${summarisePage(page)}

Return ONLY the JSON array.`;

    const messageContent: ContentBlock[] = [];

    const hasScreenshots = !!(page.screenshotBuffer || page.mobileScreenshotBuffer);

    if (page.screenshotBuffer) {
      messageContent.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: page.screenshotBuffer.toString('base64') },
      });
    }

    if (page.mobileScreenshotBuffer) {
      messageContent.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: page.mobileScreenshotBuffer.toString('base64') },
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
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1_500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: messageContent }],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
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
