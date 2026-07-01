import Anthropic from '@anthropic-ai/sdk';
import type { PageContent } from './crawler';

export interface ScanIssue {
  title: string;
  description: string;
  type: 'bug' | 'suggestion' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'accessibility' | 'seo' | 'ux' | 'content' | 'technical' | 'cro';
  view: 'desktop' | 'mobile';
  pageUrl: string;
  section: string;
}

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ─────────────────────────────────────────────────────────────
// System prompt — Claude vision: UX + CRO
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior UX designer and Conversion Rate Optimization (CRO) specialist with 15+ years of experience auditing websites. You receive desktop (1440px) and mobile (375px) screenshots plus page metadata to identify real, actionable issues.

SEO and accessibility violations are handled by separate automated tools — do NOT report them. Focus entirely on UX, CRO, content quality, and technical UX issues.

━━━ CATEGORY 1: UX & VISUAL DESIGN (category: "ux") ━━━
Inspect screenshots carefully and be thorough:

VISUAL HIERARCHY & LAYOUT:
- Primary CTA button: visually prominent? contrasting color? easy to find above the fold?
- Reading path: F-pattern or Z-pattern supported? Eyes guided to the CTA?
- Hero section value prop: immediately clear what this does, who it's for, key benefit?
- Navigation: logical grouping? too many items (>7 = overwhelm)? labels clear?
- Layout issues: misalignment, overlapping elements, clipped text, broken grid
- Whitespace: too cramped or too sparse? content buried or floating?
- Typography: inconsistent sizes? low contrast text (light gray on white)?
- Footer: CTAs missing? Links disorganized? Trust signals absent?

FORMS & INTERACTIONS:
- Form design: logical field grouping? progress indication for multi-step?
- Submit button: generic label ("Submit") vs benefit-driven ("Send my message")?
- Error states: how does the form handle validation? (if visible)

MOBILE-SPECIFIC (375px screenshot — be thorough here):
- Content cut off at right edge (horizontal scroll triggered)
- Text too small to read (below 14px visually)
- Tap targets too small or too close (<44px spacing)
- Navigation collapsed — key CTA buttons hidden in hamburger menu?
- Hero value prop visible above fold on mobile?
- Images oversized or broken on mobile
- Floating elements covering content
- CTA button not visible without scrolling on mobile

━━━ CATEGORY 2: CRO — CONVERSION RATE OPTIMIZATION (category: "cro") ━━━
Be exhaustive — identify every barrier to conversion:

ABOVE THE FOLD:
- Hero value proposition vague, generic, or feature-focused instead of benefit-focused
- Primary CTA missing, below fold, or text is weak/generic
- Too many competing CTAs (3+ equal-weight actions = confusion)
- No social proof near CTA (no review count, stars, user count, logo strip)
- Hero headline doesn't differentiate from competitors

TRUST & CREDIBILITY:
- No testimonials, customer logos, review ratings, star ratings, or case studies anywhere
- No trust badges (SSL, guarantees, certifications) near purchase/signup CTA
- No team or "About" credibility signals visible
- No contact info visible (phone, email, live chat)
- Company age or credentials not mentioned

PERSUASION & MESSAGING:
- Benefits list is vague — no specific numbers, outcomes, or proof points
- Feature-focused copy instead of outcome-focused (tells what it does, not what user gets)
- No urgency element when appropriate (limited seats, enrollment deadline, price increase)
- No "who is this for" clarity — target audience not called out
- Wall of text with no visual breaks, bullets, or callout boxes
- Headlines at section level are weak or non-existent

CONVERSION FRICTION:
- Form asks too many fields upfront (>4 fields for initial capture)
- No free trial, freemium, or risk-reversal offer visible
- No FAQ section addressing typical objections
- Pricing not discoverable or hidden entirely
- No comparison table on pricing page
- CTA copy generic: "Submit", "Click here", "Learn more", "Contact us" instead of action-outcome
- No secondary CTA for users not ready to commit (e.g., "Download brochure", "Watch demo")

MISSING CONVERSION ELEMENTS:
- No email capture / lead magnet for early-stage visitors
- No video explaining the product/service (especially for complex offerings)
- No live chat or chatbot widget for instant questions
- No exit-intent or scroll-triggered offer

━━━ CATEGORY 3: CONTENT (category: "content") ━━━
- Placeholder text visible ("Lorem ipsum", "Your text here", "Coming soon")
- Outdated copyright year in footer
- Obvious typos or grammatical errors visible in screenshot
- Broken images (broken image icon visible)
- Important content below the fold with no visual hook to scroll
- Content written for the business, not the customer (uses "we/our" heavily)

━━━ CATEGORY 4: TECHNICAL UX (category: "technical") ━━━
- JavaScript errors breaking visible functionality (from console errors in metadata)
- Missing search functionality on a content-heavy site
- Slow page indicators (many heavy third-party scripts)
- No cookie consent banner (GDPR relevance)

━━━ OUTPUT RULES ━━━
Return ONLY a valid JSON array. Each object must have exactly these fields:
{
  "title": "concise issue name, max 80 chars",
  "description": "what the problem is and the UX/conversion impact. Be specific. Max 250 chars.",
  "type": "bug" | "suggestion" | "other",
  "priority": "low" | "medium" | "high" | "critical",
  "category": "ux" | "cro" | "content" | "technical",
  "view": "desktop" | "mobile",
  "section": "exact section e.g. Hero, Navigation, Pricing table, Footer, Contact form, Mobile nav"
}

DO NOT report: color contrast ratios, ARIA attributes, alt text, HTML lang, meta description, H1/H2 count, canonical tags, OG tags, favicons — all handled by automated tools.

Be thorough and specific. Name exact sections. Aim for 8–15 real actionable issues per page. Only skip an issue if you are genuinely uncertain it exists. Return [] only if the page is exceptional.`;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function summarisePage(page: PageContent): string {
  const missingAlt = page.images.filter((i) => !i.alt).length;
  const vagueLinks = page.links.filter((l) =>
    /^(click here|here|read more|more|learn more|this|link)$/i.test(l.text.trim())
  );
  const currentYear = new Date().getFullYear();
  const copyrightOutdated = page.copyrightYear && parseInt(page.copyrightYear) < currentYear
    ? `OUTDATED — shows ${page.copyrightYear}, current year is ${currentYear}`
    : page.copyrightYear || 'not found';

  return [
    `URL: ${page.url}`,
    `HTTP status: ${page.statusCode}`,
    '',
    '── PAGE META ──',
    `Title: ${page.title || '(MISSING)'} [${page.title.length} chars]`,
    `Meta description: ${page.metaDescription || '(MISSING)'} [${page.metaDescription.length} chars]`,
    `HTML lang: ${page.lang || 'MISSING'}`,
    `Viewport meta: ${page.hasViewportMeta ? 'present' : 'MISSING'}`,
    `Canonical: ${page.canonicalUrl || 'MISSING'}`,
    `OG title: ${page.ogTitle || 'MISSING'}`,
    `OG description: ${page.ogDescription || 'MISSING'}`,
    `OG image: ${page.ogImage || 'MISSING'}`,
    `Twitter Card: ${page.twitterCard || 'MISSING'}`,
    `Favicon: ${page.hasFavicon ? 'present' : 'MISSING'}`,
    `Schema/JSON-LD markup: ${page.hasSchemaMarkup ? 'present' : 'MISSING — no structured data'}`,
    '',
    '── HEADINGS ──',
    `H1 tags (${page.h1s.length}): ${page.h1s.join(' | ') || '(none)'}`,
    `H2 tags (${page.h2s.length}): ${page.h2s.slice(0, 5).join(' | ') || '(none)'}`,
    `H3 tags (${page.h3s?.length ?? 0}): ${page.h3s?.slice(0, 4).join(' | ') || '(none)'}`,
    '',
    '── NAVIGATION & CTAs ──',
    `Nav/header links (${page.navItems.length}): ${page.navItems.slice(0, 10).join(' | ')}`,
    `Buttons on page (${page.buttons.length}): ${page.buttons.slice(0, 8).map(b => `"${b.text}"`).join(', ')}`,
    `Vague link text: ${vagueLinks.length > 0 ? vagueLinks.slice(0, 5).map(l => `"${l.text}"`).join(', ') : 'none'}`,
    '',
    '── CONTENT & TRUST ──',
    `Word count: ~${page.wordCount}`,
    `Pricing keywords found: ${page.hasPricingKeywords ? 'YES' : 'NO'}`,
    `Social proof signals: ${page.hasSocialProof ? 'YES' : 'NO — no testimonials, reviews, or customer counts detected'}`,
    `Trust signals: ${page.hasTrustSignals ? 'YES' : 'NO — no guarantee, trial, or certification language'}`,
    `Copyright year: ${copyrightOutdated}`,
    `Footer text: ${page.footerText.slice(0, 200)}`,
    '',
    '── MEDIA & EMBEDS ──',
    `Images: ${page.images.length} total, ${missingAlt} missing alt text`,
    `Iframes/embeds (${page.iframes.length}): ${page.iframes.slice(0, 3).map(f => f.src.slice(0, 60)).join(' | ') || 'none'}`,
    '',
    '── TECHNICAL ──',
    `Form fields: ${page.formFieldCount}`,
    `Form issues: ${page.formIssues.length > 0 ? page.formIssues.slice(0, 3).join('; ') : 'none'}`,
    `Third-party scripts: ${page.thirdPartyScripts.slice(0, 6).join(', ') || 'none'}`,
    `Console errors: ${page.consoleErrors.length > 0 ? page.consoleErrors.slice(0, 3).join(' | ') : 'none'}`,
    '',
    '── BODY TEXT (first 1500 chars) ──',
    page.bodyText.slice(0, 1_500),
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────
// Deterministic SEO audit
// ─────────────────────────────────────────────────────────────
function seoAudit(page: PageContent): ScanIssue[] {
  const issues: ScanIssue[] = [];
  const base = { type: 'suggestion' as const, category: 'seo' as const, view: 'desktop' as const, pageUrl: page.url, section: 'Page-level' };

  if (!page.title) {
    issues.push({ ...base, title: 'Missing page title', description: 'The <title> tag is empty or missing. Critical for SEO and browser tab display.', priority: 'critical' });
  } else if (page.title.length > 60) {
    issues.push({ ...base, title: 'Title exceeds 60 characters', description: `Title is ${page.title.length} chars — gets truncated in search results. Keep under 60.`, priority: 'low' });
  } else if (page.title.length < 10) {
    issues.push({ ...base, title: 'Title too short', description: `Title is only ${page.title.length} chars. A descriptive title improves CTR and rankings.`, priority: 'medium' });
  }

  if (!page.metaDescription) {
    issues.push({ ...base, title: 'Missing meta description', description: 'No meta description. Search engines use this as the snippet in results — critical for CTR.', priority: 'high' });
  } else if (page.metaDescription.length > 160) {
    issues.push({ ...base, title: 'Meta description too long', description: `${page.metaDescription.length} chars — truncated in search results at 160. Shorten it.`, priority: 'medium' });
  } else if (page.metaDescription.length < 50) {
    issues.push({ ...base, title: 'Meta description too short', description: `Only ${page.metaDescription.length} chars. Aim for 120–160 chars with a clear value proposition.`, priority: 'medium' });
  }

  if (page.h1s.length === 0) {
    issues.push({ ...base, title: 'Missing H1 heading', description: 'No H1 on the page. H1 is the primary keyword signal for search engines.', priority: 'high' });
  } else if (page.h1s.length > 1) {
    issues.push({ ...base, title: 'Multiple H1 headings', description: `Found ${page.h1s.length} H1 tags. Only one H1 per page is recommended.`, priority: 'medium' });
  }

  if (page.h2s.length < 2 && page.wordCount > 300) {
    issues.push({ ...base, title: 'Too few H2 headings', description: `Only ${page.h2s.length} H2 found on a ${page.wordCount}-word page. Use H2s to structure content for SEO.`, priority: 'low' });
  }

  if (!page.ogTitle) issues.push({ ...base, title: 'Missing Open Graph title', description: 'No og:title tag. Controls how the page looks when shared on social media.', priority: 'low' });
  if (!page.ogDescription) issues.push({ ...base, title: 'Missing Open Graph description', description: 'No og:description tag. Required for rich previews on Facebook, LinkedIn, WhatsApp.', priority: 'low' });
  if (!page.ogImage) issues.push({ ...base, title: 'Missing Open Graph image', description: 'No og:image tag. Social shares show no image, drastically reducing engagement.', priority: 'medium' });
  if (!page.twitterCard) issues.push({ ...base, title: 'Missing Twitter Card meta tag', description: 'No twitter:card tag. Tweets linking this page show plain text with no rich preview.', priority: 'low' });
  if (!page.canonicalUrl) issues.push({ ...base, title: 'Missing canonical URL', description: 'No <link rel="canonical"> found. Can cause duplicate content issues.', priority: 'medium' });
  if (!page.hasSchemaMarkup) issues.push({ ...base, title: 'No structured data (Schema.org) markup', description: 'No JSON-LD schema found. Structured data enables rich snippets (reviews, FAQ, events) in search results — improving organic CTR.', priority: 'medium' });
  if (!page.lang) issues.push({ ...base, title: 'Missing HTML lang attribute', description: '<html> has no lang attribute. Required for accessibility and language detection by search engines.', priority: 'medium', category: 'accessibility' });
  if (!page.hasFavicon) issues.push({ ...base, title: 'Missing favicon', description: 'No favicon in HTML. Affects brand recognition in browser tabs and bookmarks.', priority: 'low', category: 'technical' });

  const isFilenameAlt = (alt: string) =>
    /^[\w\-]+\.(png|jpg|jpeg|svg|webp|gif)$/i.test(alt.trim()) ||
    /^(image|img|photo|picture|screenshot|hero|banner|icon|logo)[\-_]?\d*$/i.test(alt.trim());
  const missingAlt = page.images.filter((i) => !i.alt || isFilenameAlt(i.alt)).length;
  if (missingAlt > 0) {
    issues.push({ ...base, title: `${missingAlt} image${missingAlt > 1 ? 's' : ''} missing descriptive alt text`, description: `${missingAlt} image(s) have no alt or a filename as alt. Required for accessibility and image SEO.`, priority: missingAlt > 3 ? 'high' : 'medium', category: 'accessibility' });
  }

  const vagueLinks = page.links.filter((l) => /^(click here|here|read more|more|learn more|this|link)$/i.test(l.text.trim()));
  if (vagueLinks.length > 0) {
    issues.push({ ...base, title: 'Vague link anchor text', description: `${vagueLinks.length} link(s) use generic text like "click here" or "read more". Descriptive anchor text improves SEO.`, priority: 'low' });
  }

  if (page.wordCount < 300) {
    issues.push({ ...base, title: 'Thin content — low word count', description: `~${page.wordCount} words. Pages under 300 words are thin content and may rank poorly.`, priority: 'medium' });
  }

  if (page.statusCode >= 400) {
    issues.push({ ...base, title: `HTTP ${page.statusCode} error`, description: `Page returned ${page.statusCode}. Not indexable by search engines.`, priority: 'critical', type: 'bug', category: 'technical' });
  }

  // No internal links to key pages
  const internalLinks = page.links.filter(l => !l.isExternal && l.text.trim().length > 0);
  if (internalLinks.length < 3 && page.wordCount > 300) {
    issues.push({ ...base, title: 'Very few internal links on page', description: `Only ${internalLinks.length} internal link(s). Internal linking passes authority, helps crawlers, and keeps users on site. Add links to related content.`, priority: 'low' });
  }

  // Missing OG image on a content page
  if (!page.ogImage && page.wordCount > 200) {
    issues.push({ ...base, title: 'No social share image (og:image)', description: 'No og:image tag. When shared on Facebook, LinkedIn, or WhatsApp the link shows no image, drastically reducing click-through rate.', priority: 'medium' });
  }

  // H2 heading structure
  if (page.h2s.length === 0 && page.wordCount > 400) {
    issues.push({ ...base, title: 'No H2 headings — poor content structure', description: `No H2 tags found on a ${page.wordCount}-word page. H2s help search engines understand content structure and improve keyword targeting.`, priority: 'medium' });
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────
// Deterministic CRO audit (from page metadata)
// ─────────────────────────────────────────────────────────────
function croAudit(page: PageContent): ScanIssue[] {
  const issues: ScanIssue[] = [];
  const base = { type: 'suggestion' as const, category: 'cro' as const, view: 'desktop' as const, pageUrl: page.url };
  const body = page.bodyText.toLowerCase();
  const isPricingPage = /pricing|plans?|subscription/i.test(page.url) || /pricing|plans?/i.test(page.title);

  // ── CTA copy quality ──
  const weakCtaPatterns = /^(submit|click here|learn more|read more|more info|contact us|find out more|go|ok|yes|no)$/i;
  const weakCtaLinks = page.links.filter(l => weakCtaPatterns.test(l.text.trim()));
  const weakCtaButtons = page.buttons.filter(b => weakCtaPatterns.test(b.text.trim()));
  if (weakCtaLinks.length > 0 || weakCtaButtons.length > 0) {
    const examples = [...weakCtaLinks.map(l => `"${l.text}"`), ...weakCtaButtons.map(b => `"${b.text}"`)].slice(0, 3).join(', ');
    issues.push({ ...base, section: 'CTAs', title: 'Generic CTA copy found', description: `CTAs use weak text: ${examples}. Replace with benefit-driven copy like "Start free trial" or "Get my report" to improve click-through rates.`, priority: 'medium' });
  }

  // ── No buttons at all ──
  if (page.buttons.length === 0 && page.links.length < 5) {
    issues.push({ ...base, section: 'Page-level', title: 'No clear call-to-action buttons on page', description: 'No buttons detected. Without prominent CTAs, visitors have no clear next step. Add at least one above-the-fold CTA button.', priority: 'critical' });
  }

  // ── Social proof ──
  if (!page.hasSocialProof) {
    issues.push({ ...base, section: 'Page-level', title: 'No social proof detected on page', description: 'No testimonials, reviews, ratings, or customer counts found. Social proof near CTAs can increase conversions by 20–30%.', priority: 'high' });
  }

  // ── Trust / risk reversal ──
  if (!page.hasTrustSignals) {
    issues.push({ ...base, section: 'CTA area', title: 'No risk-reversal signals found', description: 'No mention of money-back guarantee, free trial, or "no credit card required". These reduce purchase anxiety and lower abandonment.', priority: 'high' });
  }

  // ── Contact info ──
  const hasContact = /\b(\+\d|call us|email us|contact@|support@|chat|help@|phone|telephone)/i.test(body)
    || page.links.some(l => /contact|support|help/i.test(l.text));
  if (!hasContact) {
    issues.push({ ...base, section: 'Page-level', title: 'No visible contact information', description: 'No phone number, email, or chat widget found. Visible contact info builds trust and reduces bounce, especially for B2B visitors.', priority: 'medium' });
  }

  // ── Vague H1 value proposition ──
  if (page.h1s.length > 0) {
    const h1 = page.h1s[0].toLowerCase().trim();
    const wordCount = h1.split(/\s+/).length;
    const isVague = wordCount < 4 || /^(welcome|home|about|our services|solutions|products|services|hello|hi there)$/i.test(h1);
    if (isVague) {
      issues.push({ ...base, section: 'Hero', title: 'H1 lacks a clear value proposition', description: `H1 "${page.h1s[0]}" is too vague. A strong H1 answers: what is it, who it's for, and the key benefit. Rewrite for conversion clarity.`, priority: 'high' });
    }
  }

  // ── Navigation overload ──
  const uniqueNavItems = [...new Set(page.navItems)];
  if (uniqueNavItems.length > 8) {
    issues.push({ ...base, section: 'Navigation', title: 'Navigation has too many items', description: `${uniqueNavItems.length} nav links detected. More than 7 items causes decision paralysis. Group into dropdowns or remove low-priority links.`, priority: 'medium' });
  }

  // ── No video content (for complex products/services) ──
  const hasVideo = page.iframes.some(f => /youtube|vimeo|wistia|loom|vidyard/i.test(f.src)) || /video|watch|demo/i.test(body);
  if (!hasVideo && page.wordCount > 400) {
    issues.push({ ...base, section: 'Page-level', title: 'No video or demo content detected', description: 'No video embed found. For complex products or services, a 60-90 second explainer video can increase conversions by 80%+.', priority: 'low' });
  }

  // ── Urgency / scarcity signals ──
  const hasUrgency = /limited time|expires|deadline|ends soon|hurry|last chance|seats? (left|available|remaining)|enrol.{0,10}(now|today)|early.?bird|register (by|before)/i.test(body);
  if (!hasUrgency && (isPricingPage || /enrol|register|sign.?up|join/i.test(body))) {
    issues.push({ ...base, section: 'Page-level', title: 'No urgency signals on enrollment/conversion page', description: 'No deadline, scarcity, or time-limited offer detected. Adding urgency (enrollment deadline, limited seats) can significantly increase conversion rate.', priority: 'medium' });
  }

  // ── Email capture / lead magnet ──
  const hasEmailCapture = /newsletter|subscribe|email.*update|free.*guide|download|resource|ebook|whitepaper|cheat sheet|template/i.test(body)
    || (page.formFieldCount > 0 && /email/i.test(body));
  if (!hasEmailCapture && !isPricingPage) {
    issues.push({ ...base, section: 'Page-level', title: 'No email capture or lead magnet offered', description: 'No newsletter signup or lead magnet found. Capturing emails from non-converting visitors lets you nurture them into customers over time.', priority: 'low' });
  }

  // ── FAQ / objection handling ──
  const hasFaq = /faq|frequently asked|question|common|how (does|do|can|long)|what (is|are|does)|why (choose|us|our)/i.test(body);
  if (!hasFaq && page.wordCount > 300) {
    issues.push({ ...base, section: 'Page-level', title: 'No FAQ or objection-handling content', description: 'No FAQ section detected. Adding FAQs addresses visitor doubts before they leave, reducing bounce and increasing conversion rate.', priority: 'low' });
  }

  // ── Benefit-focused copy check ──
  const weCount = (body.match(/\b(we |our |us |we're |we've )/g) || []).length;
  const youCount = (body.match(/\b(you |your |you'll |you're )/g) || []).length;
  if (weCount > 0 && youCount === 0 && page.wordCount > 200) {
    issues.push({ ...base, section: 'Content', title: 'Copy is company-focused, not customer-focused', description: `High "we/our" usage with no "you/your" detected. Customer-centric copy ("you'll get", "your results") converts better than company-focused ("we provide", "our team").`, priority: 'medium' });
  }

  // ── Pricing page specific checks ──
  if (isPricingPage) {
    const hasComparison = /feature|compare|includes?|everything in|vs\.?|versus|most popular/i.test(body);
    if (!hasComparison) {
      issues.push({ ...base, section: 'Pricing', title: 'Pricing page lacks plan comparison', description: 'No feature comparison between plans detected. Users need to easily compare tiers to make a purchase decision.', priority: 'high' });
    }
    const hasPricingFaq = /faq|frequently asked|question/i.test(body);
    if (!hasPricingFaq) {
      issues.push({ ...base, section: 'Pricing', title: 'No FAQ section on pricing page', description: 'FAQ on pricing pages reduces objections and support requests. Cover billing, cancellation, and feature questions.', priority: 'medium' });
    }
    const hasMoneyBack = /money.back|guarantee|refund|cancel any|no.lock/i.test(body);
    if (!hasMoneyBack) {
      issues.push({ ...base, section: 'Pricing', title: 'No money-back guarantee on pricing page', description: 'No refund policy or guarantee visible near purchase CTAs. A money-back guarantee is one of the highest-impact trust signals for paid plans.', priority: 'high' });
    }
  }

  // ── Thin content ──
  if (page.wordCount < 200 && !isPricingPage) {
    issues.push({ ...base, section: 'Page-level', title: 'Very little content to persuade visitors', description: `Only ~${page.wordCount} words. Too little content to build trust or address objections. Add benefits, social proof, and a clear value proposition.`, priority: 'medium' });
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────
// Performance / technical audit (deterministic)
// ─────────────────────────────────────────────────────────────
function technicalAudit(page: PageContent): ScanIssue[] {
  const issues: ScanIssue[] = [];
  const base = { type: 'suggestion' as const, category: 'technical' as const, view: 'desktop' as const, pageUrl: page.url, section: 'Page-level' };

  // Many third-party scripts = performance risk
  if (page.thirdPartyScripts.length >= 5) {
    issues.push({ ...base, title: `${page.thirdPartyScripts.length} third-party scripts loaded`, description: `Scripts from: ${page.thirdPartyScripts.slice(0, 4).join(', ')}. Each third-party script adds latency. Audit and remove unused scripts to improve page speed.`, priority: page.thirdPartyScripts.length >= 8 ? 'high' : 'medium' });
  }

  // Console errors
  if (page.consoleErrors.length > 0) {
    issues.push({ ...base, title: `${page.consoleErrors.length} JavaScript console error(s)`, description: page.consoleErrors.slice(0, 2).join('; ').slice(0, 250), priority: 'high', type: 'bug' as const });
  }

  // Missing viewport meta
  if (!page.hasViewportMeta) {
    issues.push({ ...base, title: 'Missing viewport meta tag', description: 'No <meta name="viewport"> found. The page will not scale correctly on mobile devices.', priority: 'critical', category: 'accessibility' as const });
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────
// Deterministic Axe audit
// ─────────────────────────────────────────────────────────────
const SEO_AUDIT_AXE_RULES = new Set(['html-has-lang', 'image-alt', 'meta-viewport']);
const AXE_IMPACT_PRIORITY: Record<string, ScanIssue['priority']> = {
  critical: 'critical',
  serious: 'high',
  moderate: 'medium',
  minor: 'low',
};

function axeAudit(page: PageContent): ScanIssue[] {
  if (!page.axeViolations?.length) return [];
  return page.axeViolations
    .filter(v => !SEO_AUDIT_AXE_RULES.has(v.id))
    .map(v => {
      const nodeCount = v.nodes.length;
      const firstNode = v.nodes[0];
      let section = 'Page-level';
      if (firstNode?.target?.length) {
        const raw = String(firstNode.target[0]);
        section = raw.length > 60 ? raw.slice(0, 57) + '...' : raw;
      }
      const failureSummary = firstNode?.failureSummary ?? '';
      return {
        title: `${v.help}${nodeCount > 1 ? ` (${nodeCount} elements)` : ''}`.slice(0, 80),
        description: (failureSummary ? `WCAG/${v.id}: ${failureSummary}` : `WCAG/${v.id}: ${v.description}`).slice(0, 250),
        type: 'bug' as const,
        priority: AXE_IMPACT_PRIORITY[v.impact ?? 'minor'] ?? 'low',
        category: 'accessibility' as const,
        view: 'desktop' as const,
        section,
        pageUrl: page.url,
      };
    });
}

// ─────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────
export async function analyzePages(pages: PageContent[]): Promise<ScanIssue[]> {
  const allIssues: ScanIssue[] = [];

  for (const page of pages) {
    // Deterministic audits — no AI variability
    allIssues.push(...seoAudit(page));
    allIssues.push(...axeAudit(page));
    allIssues.push(...croAudit(page));
    allIssues.push(...technicalAudit(page));

    // ── Claude vision analysis ──────────────────────────────
    const hasScreenshots = !!(page.screenshotBuffer || page.mobileScreenshotBuffer);

    type ContentBlock =
      | { type: 'image'; source: { type: 'base64'; media_type: 'image/png'; data: string } }
      | { type: 'text'; text: string };

    const content: ContentBlock[] = [];

    if (page.screenshotBuffer) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: page.screenshotBuffer.toString('base64') },
      });
    }

    if (page.mobileScreenshotBuffer) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: page.mobileScreenshotBuffer.toString('base64') },
      });
    }

    const analysisPrompt = hasScreenshots
      ? `Analyze this website page for UX and CRO issues using the screenshots provided.
First image = desktop view (1440px wide). ${page.mobileScreenshotBuffer ? 'Second image = mobile view (375px wide).' : ''}

Return a JSON array of issues. Focus on UX problems and conversion barriers you can clearly identify. Be specific about which section of the page the issue is in.

Page metadata for context (do NOT re-report SEO/accessibility from this):
${summarisePage(page)}

Return ONLY the JSON array.`
      : `Analyze this page for UX and CRO issues based on the metadata below. No screenshots available.

${summarisePage(page)}

Infer UX and CRO issues from the metadata (word count, form issues, content, link text, H1 quality, etc.).
Return ONLY a JSON array.`;

    content.push({ type: 'text', text: analysisPrompt });

    try {
      const response = await getClient().messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      });

      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('');

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
      const validAiCategories = new Set(['ux', 'cro', 'content', 'technical']);

      for (const issue of parsed) {
        if (!issue.title || !issue.description) continue;
        // SEO and accessibility come from deterministic audits only
        if (issue.category === 'seo' || issue.category === 'accessibility') continue;
        allIssues.push({
          title: String(issue.title).slice(0, 80),
          description: String(issue.description).slice(0, 250),
          type: validTypes.has(issue.type ?? '') ? (issue.type as ScanIssue['type']) : 'suggestion',
          priority: validPriorities.has(issue.priority ?? '') ? (issue.priority as ScanIssue['priority']) : 'medium',
          category: validAiCategories.has(issue.category ?? '') ? (issue.category as ScanIssue['category']) : 'ux',
          view: issue.view === 'mobile' ? 'mobile' : 'desktop',
          section: issue.section ? String(issue.section).slice(0, 80) : 'Page-level',
          pageUrl: page.url,
        });
      }
    } catch (err) {
      console.error(`Claude analysis failed for ${page.url}:`, err);
    }
  }

  // Deduplicate by normalised title
  const seen = new Set<string>();
  return allIssues.filter((issue) => {
    const key = issue.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
