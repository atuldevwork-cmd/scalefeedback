import type { Browser } from 'puppeteer';

// Single place that decides how to launch headless Chromium: bundled
// `puppeteer` locally, `puppeteer-core` + `@sparticuz/chromium` (serverless-
// packaged binary) on Vercel. Throws on launch failure — callers decide
// whether to fall back (e.g. crawler.ts falls back to a plain-fetch crawl;
// the screenshot renderer should NOT silently degrade, it should fail the
// request so the widget falls back to its own client-side capture instead).
export async function getBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const chromium = await import('@sparticuz/chromium');
    const puppeteer = await (import('puppeteer-core') as Promise<typeof import('puppeteer')>);
    const executablePath = await chromium.default.executablePath();
    return puppeteer.default.launch({
      headless: true,
      executablePath,
      args: chromium.default.args,
    });
  }
  const puppeteer = await import('puppeteer');
  return puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
}
