import { load } from 'cheerio';

export interface PageContent {
  url: string;
  statusCode: number;
  title: string;
  metaDescription: string;
  lang: string;
  hasViewportMeta: boolean;
  h1s: string[];
  h2s: string[];
  images: Array<{ src: string; alt: string }>;
  links: Array<{ href: string; text: string; isExternal: boolean }>;
  formIssues: string[];
  bodyText: string;
  consoleErrors: string[];
  screenshotBuffer?: Buffer;
  mobileScreenshotBuffer?: Buffer;
}

export interface CrawlResult {
  pages: PageContent[];
  failedUrls: Array<{ url: string; reason: string }>;
}

const PAGE_TIMEOUT_MS = 20_000;
const MAX_BODY_CHARS = 3_000;

const BOT_UA = 'Mozilla/5.0 (compatible; ScaleFeedbackBot/1.0; +https://scalefeedback.com)';

function isSitemapUrl(url: string) {
  return /sitemap.*\.xml/i.test(url);
}

function isSpecificPage(url: string): boolean {
  const path = new URL(url).pathname.replace(/\/$/, '');
  return path.length > 0;
}

function parseHtmlContent(url: string, html: string, statusCode: number): Omit<PageContent, 'consoleErrors' | 'screenshotBuffer' | 'mobileScreenshotBuffer'> {
  const $ = load(html);
  $('script, style, noscript').remove();

  const baseOrigin = new URL(url).origin;

  const images: PageContent['images'] = [];
  $('img').each((_, el) => {
    images.push({ src: $(el).attr('src') ?? '', alt: $(el).attr('alt') ?? '' });
  });

  const links: PageContent['links'] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const text = $(el).text().trim();
    try {
      const resolved = new URL(href, url);
      links.push({ href: resolved.href, text, isExternal: resolved.origin !== baseOrigin });
    } catch { /* skip */ }
  });

  const formIssues: string[] = [];
  $('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="reset"])').each((_, el) => {
    const id = $(el).attr('id');
    const name = $(el).attr('name') ?? '';
    const type = $(el).attr('type') ?? 'text';
    const hasLabel = id ? $(`label[for="${id}"]`).length > 0 : false;
    const hasAriaLabel = !!($(el).attr('aria-label') ?? $(el).attr('aria-labelledby'));
    const hasPlaceholder = !!$(el).attr('placeholder');
    if (!hasLabel && !hasAriaLabel && !hasPlaceholder) {
      formIssues.push(`${type} input "${name || 'unnamed'}" has no accessible label`);
    }
  });

  return {
    url,
    statusCode,
    title: $('title').text().trim(),
    metaDescription: $('meta[name="description"]').attr('content') ?? '',
    lang: $('html').attr('lang') ?? '',
    hasViewportMeta: $('meta[name="viewport"]').length > 0,
    h1s: $('h1').map((_, el) => $(el).text().trim()).get(),
    h2s: $('h2').map((_, el) => $(el).text().trim()).get(),
    images,
    links,
    formIssues,
    bodyText: $('body').text().replace(/\s+/g, ' ').trim().slice(0, MAX_BODY_CHARS),
  };
}

// ─── Fetch-based crawler (production / Vercel) ───────────────────────────────

async function fetchPage(url: string): Promise<PageContent> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
  let statusCode = 200;
  let html = '';
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': BOT_UA, Accept: 'text/html,*/*;q=0.9' },
      redirect: 'follow',
    });
    statusCode = resp.status;
    html = await resp.text();
  } finally {
    clearTimeout(timer);
  }
  const parsed = parseHtmlContent(url, html, statusCode);
  return { ...parsed, consoleErrors: [] };
}

async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 10_000);
  const resp = await fetch(sitemapUrl, { signal: controller.signal, headers: { 'User-Agent': BOT_UA } });
  const text = await resp.text();
  const urls: string[] = [];
  for (const m of text.matchAll(/<loc>(.*?)<\/loc>/g)) {
    const u = m[1].trim();
    if (!u.endsWith('.xml')) urls.push(u);
  }
  if (urls.length === 0) {
    for (const m of text.matchAll(/(https?:\/\/[^\s<>"]+)/g)) {
      const u = m[1].trim();
      if (!u.endsWith('.xml')) urls.push(u);
    }
  }
  return urls;
}

async function fetchDiscoverUrls(startUrl: string, maxPages: number): Promise<string[]> {
  const base = new URL(startUrl);
  // Try sitemap.xml first
  try {
    const sitemapUrl = `${base.origin}/sitemap.xml`;
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 8_000);
    const resp = await fetch(sitemapUrl, { signal: ctrl.signal, headers: { 'User-Agent': BOT_UA } });
    if (resp.ok) {
      const text = await resp.text();
      if (text.includes('<loc>')) {
        const urls: string[] = [startUrl];
        for (const m of text.matchAll(/<loc>(.*?)<\/loc>/g)) {
          const u = m[1].trim();
          if (!u.endsWith('.xml') && u !== startUrl) urls.push(u);
        }
        if (urls.length > 1) return urls.slice(0, maxPages);
      }
    }
  } catch { /* no sitemap */ }

  // Crawl links from homepage HTML
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), PAGE_TIMEOUT_MS);
  const resp = await fetch(startUrl, { signal: ctrl.signal, headers: { 'User-Agent': BOT_UA } });
  const html = await resp.text();
  const $ = load(html);
  const found = new Set<string>([startUrl]);
  $('a[href]').each((_, el) => {
    try {
      const resolved = new URL($(el).attr('href') ?? '', startUrl);
      if (resolved.origin === base.origin) {
        found.add(`${resolved.origin}${resolved.pathname}`);
      }
    } catch { /* skip */ }
  });
  return [...found].slice(0, maxPages);
}

async function crawlWithFetch(url: string, maxPages: number): Promise<CrawlResult> {
  let urlsToScan: string[];
  if (isSitemapUrl(url)) {
    urlsToScan = (await fetchSitemapUrls(url)).slice(0, maxPages);
  } else if (isSpecificPage(url)) {
    urlsToScan = [url];
  } else {
    urlsToScan = await fetchDiscoverUrls(url, maxPages);
  }

  const pages: PageContent[] = [];
  const failedUrls: CrawlResult['failedUrls'] = [];
  for (const pageUrl of urlsToScan) {
    try {
      pages.push(await fetchPage(pageUrl));
    } catch (err) {
      failedUrls.push({ url: pageUrl, reason: err instanceof Error ? err.message : String(err) });
    }
  }
  return { pages, failedUrls };
}

// ─── Puppeteer-based crawler (local dev only) ────────────────────────────────

async function crawlWithPuppeteer(url: string, maxPages: number): Promise<CrawlResult> {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  type PuppeteerBrowser = typeof browser;
  type PuppeteerPage = Awaited<ReturnType<PuppeteerBrowser['newPage']>>;

  async function crawlPage(pageUrl: string): Promise<PageContent> {
    const page: PuppeteerPage = await browser.newPage();
    const consoleErrors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err: unknown) => { consoleErrors.push(err instanceof Error ? err.message : String(err)); });

    let statusCode = 200;
    page.on('response', (resp) => {
      if (resp.url() === pageUrl || resp.url() === pageUrl + '/') statusCode = resp.status();
    });

    await page.setViewport({ width: 1440, height: 900 });
    try {
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT_MS });
    } catch {
      await page.goto(pageUrl, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });
    }

    let screenshotBuffer: Buffer | undefined;
    try {
      const raw = await page.screenshot({ type: 'png', fullPage: false });
      screenshotBuffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as Uint8Array);
    } catch { /* ignore */ }

    let mobileScreenshotBuffer: Buffer | undefined;
    try {
      await page.setViewport({ width: 375, height: 812 });
      await new Promise((r) => setTimeout(r, 400));
      const mobileRaw = await page.screenshot({ type: 'png', fullPage: false });
      mobileScreenshotBuffer = Buffer.isBuffer(mobileRaw) ? mobileRaw : Buffer.from(mobileRaw as Uint8Array);
    } catch { /* ignore */ }

    const html = await page.content();
    await page.close();
    const parsed = parseHtmlContent(pageUrl, html, statusCode);
    return { ...parsed, consoleErrors, screenshotBuffer, mobileScreenshotBuffer };
  }

  async function parseSitemapUrls(sitemapUrl: string): Promise<string[]> {
    const page: PuppeteerPage = await browser.newPage();
    await page.goto(sitemapUrl, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });
    const text = await page.evaluate(() => document.body.innerText);
    await page.close();
    const urls: string[] = [];
    for (const m of text.matchAll(/<loc>(.*?)<\/loc>/g)) {
      const u = m[1].trim(); if (!u.endsWith('.xml')) urls.push(u);
    }
    if (urls.length === 0) {
      for (const m of text.matchAll(/(https?:\/\/[^\s<>"]+)/g)) {
        const u = m[1].trim(); if (!u.endsWith('.xml')) urls.push(u);
      }
    }
    return urls;
  }

  async function discoverUrls(startUrl: string): Promise<string[]> {
    const base = new URL(startUrl);
    try {
      const sitemapPage: PuppeteerPage = await browser.newPage();
      const sitemapUrl = `${base.origin}/sitemap.xml`;
      const resp = await sitemapPage.goto(sitemapUrl, { waitUntil: 'load', timeout: 10_000 });
      const text = await sitemapPage.evaluate(() => document.body.innerText);
      await sitemapPage.close();
      if (resp?.ok() && text.includes('<loc>')) {
        const urls: string[] = [startUrl];
        for (const m of text.matchAll(/<loc>(.*?)<\/loc>/g)) {
          const u = m[1].trim(); if (!u.endsWith('.xml') && u !== startUrl) urls.push(u);
        }
        if (urls.length > 1) return urls.slice(0, maxPages);
      }
    } catch { /* no sitemap */ }
    const page: PuppeteerPage = await browser.newPage();
    await page.goto(startUrl, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });
    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]')).map((a) => (a as HTMLAnchorElement).href)
    );
    await page.close();
    const found = new Set<string>([startUrl]);
    for (const href of hrefs) {
      try {
        const resolved = new URL(href);
        if (resolved.origin === base.origin) found.add(`${resolved.origin}${resolved.pathname}`);
      } catch { /* skip */ }
    }
    return [...found].slice(0, maxPages);
  }

  try {
    let urlsToScan: string[];
    if (isSitemapUrl(url)) {
      urlsToScan = (await parseSitemapUrls(url)).slice(0, maxPages);
    } else if (isSpecificPage(url)) {
      urlsToScan = [url];
    } else {
      urlsToScan = await discoverUrls(url);
    }
    const pages: PageContent[] = [];
    const failedUrls: CrawlResult['failedUrls'] = [];
    for (const pageUrl of urlsToScan) {
      try { pages.push(await crawlPage(pageUrl)); }
      catch (err) { failedUrls.push({ url: pageUrl, reason: err instanceof Error ? err.message : String(err) }); }
    }
    return { pages, failedUrls };
  } finally {
    await browser.close();
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function crawlWebsite(url: string, maxPages = 10): Promise<CrawlResult> {
  if (process.env.VERCEL) {
    console.log('[crawler] Using fetch-based crawler (production)');
    return crawlWithFetch(url, maxPages);
  }
  console.log('[crawler] Using Puppeteer crawler (local dev)');
  return crawlWithPuppeteer(url, maxPages);
}
