import { load } from 'cheerio';
import type { Browser } from 'puppeteer-core';

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

function isSitemapUrl(url: string) {
  return /sitemap.*\.xml/i.test(url);
}

function isSpecificPage(url: string): boolean {
  // A "specific page" has a non-root path like /about-us, /blog/post
  const path = new URL(url).pathname.replace(/\/$/, '');
  return path.length > 0;
}

function parseHtmlContent(url: string, html: string, statusCode: number): Omit<PageContent, 'consoleErrors' | 'screenshotBuffer'> {
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

async function crawlPage(browser: Browser, url: string): Promise<PageContent> {
  const page = await browser.newPage();

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err: unknown) => {
    consoleErrors.push(err instanceof Error ? err.message : String(err));
  });

  // Intercept response to capture status code
  let statusCode = 200;
  page.on('response', (resp) => {
    if (resp.url() === url || resp.url() === url + '/') {
      statusCode = resp.status();
    }
  });

  await page.setViewport({ width: 1440, height: 900 });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT_MS });
  } catch {
    // networkidle2 may timeout on heavy pages — try load instead
    await page.goto(url, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });
  }

  let screenshotBuffer: Buffer | undefined;
  try {
    const raw = await page.screenshot({ type: 'png', fullPage: false });
    screenshotBuffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as Uint8Array);
    console.log(`[crawler] Screenshot taken for ${url}: ${screenshotBuffer.byteLength} bytes`);
  } catch (err) {
    console.error(`[crawler] Screenshot failed for ${url}:`, err);
  }

  // Mobile screenshot for responsiveness analysis
  let mobileScreenshotBuffer: Buffer | undefined;
  try {
    await page.setViewport({ width: 375, height: 812 });
    await new Promise((r) => setTimeout(r, 400)); // allow reflow
    const mobileRaw = await page.screenshot({ type: 'png', fullPage: false });
    mobileScreenshotBuffer = Buffer.isBuffer(mobileRaw) ? mobileRaw : Buffer.from(mobileRaw as Uint8Array);
    console.log(`[crawler] Mobile screenshot taken for ${url}: ${mobileScreenshotBuffer.byteLength} bytes`);
  } catch (err) {
    console.error(`[crawler] Mobile screenshot failed for ${url}:`, err);
  }

  const html = await page.content();
  await page.close();

  const parsed = parseHtmlContent(url, html, statusCode);
  return { ...parsed, consoleErrors, screenshotBuffer, mobileScreenshotBuffer };
}

async function parseSitemapUrls(browser: Browser, sitemapUrl: string): Promise<string[]> {
  const page = await browser.newPage();
  await page.goto(sitemapUrl, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });
  const text = await page.evaluate(() => document.body.innerText);
  await page.close();

  const urls: string[] = [];
  for (const m of text.matchAll(/<loc>(.*?)<\/loc>/g)) {
    const u = m[1].trim();
    if (!u.endsWith('.xml')) urls.push(u);
  }

  // Fallback: parse raw XML content
  if (urls.length === 0) {
    for (const m of text.matchAll(/(https?:\/\/[^\s<>"]+)/g)) {
      const u = m[1].trim();
      if (!u.endsWith('.xml')) urls.push(u);
    }
  }

  return urls;
}

async function discoverUrls(browser: Browser, startUrl: string, maxPages: number): Promise<string[]> {
  // Try sitemap.xml at root
  try {
    const base = new URL(startUrl);
    const sitemapPage = await browser.newPage();
    const sitemapUrl = `${base.origin}/sitemap.xml`;
    const resp = await sitemapPage.goto(sitemapUrl, { waitUntil: 'load', timeout: 10_000 });
    const text = await sitemapPage.evaluate(() => document.body.innerText);
    await sitemapPage.close();

    if (resp?.ok() && text.includes('<loc>')) {
      const urls: string[] = [startUrl];
      for (const m of text.matchAll(/<loc>(.*?)<\/loc>/g)) {
        const u = m[1].trim();
        if (!u.endsWith('.xml') && u !== startUrl) urls.push(u);
      }
      if (urls.length > 1) return urls.slice(0, maxPages);
    }
  } catch { /* no sitemap */ }

  // Crawl links from start URL
  const page = await browser.newPage();
  await page.goto(startUrl, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });
  const baseOrigin = new URL(startUrl).origin;
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]')).map((a) => (a as HTMLAnchorElement).href)
  );
  await page.close();

  const found = new Set<string>([startUrl]);
  for (const href of hrefs) {
    try {
      const resolved = new URL(href);
      if (resolved.origin === baseOrigin) {
        found.add(`${resolved.origin}${resolved.pathname}`);
      }
    } catch { /* skip */ }
  }

  return [...found].slice(0, maxPages);
}

async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    // Production: download Chromium to /tmp (only writable dir on Vercel Lambda)
    const chromium = await import('@sparticuz/chromium');
    const puppeteerCore = await import('puppeteer-core');
    return puppeteerCore.default.launch({
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath('/tmp/chromium'),
      headless: true,
    });
  }
  // Local dev: use bundled Puppeteer + Chromium
  const puppeteer = await import('puppeteer');
  return puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
}

export async function crawlWebsite(url: string, maxPages = 10): Promise<CrawlResult> {
  const browser = await launchBrowser();

  try {
    let urlsToScan: string[];

    if (isSitemapUrl(url)) {
      // Explicit sitemap URL — parse and scan all pages
      urlsToScan = (await parseSitemapUrls(browser, url)).slice(0, maxPages);
    } else if (isSpecificPage(url)) {
      // Specific page URL like /about-us — scan only that page
      urlsToScan = [url];
    } else {
      // Root URL — discover and scan multiple pages
      urlsToScan = await discoverUrls(browser, url, maxPages);
    }

    const pages: PageContent[] = [];
    const failedUrls: CrawlResult['failedUrls'] = [];

    for (const pageUrl of urlsToScan) {
      try {
        pages.push(await crawlPage(browser, pageUrl));
      } catch (err) {
        failedUrls.push({ url: pageUrl, reason: err instanceof Error ? err.message : String(err) });
      }
    }

    return { pages, failedUrls };
  } finally {
    await browser.close();
  }
}
