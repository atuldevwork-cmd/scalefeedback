import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { requireProjectAccess } from '@/lib/monitor-auth';
import { planAtLeast } from '@/lib/plan';

export const dynamic = 'force-dynamic';

// Module D from the AEO spec: when llms.txt is missing, generate a starting
// template from data we can actually crawl deterministically — no AI call.
// We can't deploy this to the user's site (no write access to arbitrary
// customer infra), so this just returns text for them to copy and upload to
// https://their-domain.com/llms.txt themselves.
const BOT_UA = 'Mozilla/5.0 (compatible; PinmarksBot/1.0; +https://pinmarks.com)';
const FETCH_TIMEOUT_MS = 8_000;
// Common key-page paths worth checking — a handful of fast fetches, not a
// full site crawl, just enough to seed a useful template.
const CANDIDATE_PATHS = ['/about', '/about-us', '/services', '/pricing', '/blog', '/contact', '/contact-us'];
const MAX_KEY_PAGES = 4;

interface PageSummary { url: string; title: string; description: string }

async function fetchPageSummary(url: string): Promise<PageSummary | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': BOT_UA }, redirect: 'follow', signal: controller.signal });
    const contentType = resp.headers.get('content-type') ?? '';
    if (!resp.ok || !contentType.includes('html')) return null;
    const html = await resp.text();
    const $ = load(html);
    const title = $('title').first().text().trim();
    const description = $('meta[name="description"]').attr('content')?.trim() ?? '';
    return { url, title, description };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildLlmsTxt(origin: string, homepage: PageSummary, keyPages: PageSummary[]): { text: string; brandName: string } {
  // Homepage <title> is commonly "Brand Name — Tagline" or "Brand | Page" —
  // the part before the first separator is usually the brand name itself.
  const brandName = homepage.title.split(/[-|–—]/)[0].trim() || new URL(origin).hostname;
  const summary = homepage.description || homepage.title || `${brandName}, at ${origin}`;

  const lines: string[] = [
    `# ${brandName}`,
    '',
    `> ${summary}`,
    '',
    '## Key Pages',
    `- [Homepage](${origin}/): ${homepage.description || homepage.title || 'Homepage'}`,
  ];
  for (const page of keyPages) {
    lines.push(`- [${page.title || page.url}](${page.url}): ${page.description || page.title || 'No description found — fill this in'}`);
  }
  lines.push(
    '',
    '## What We Do',
    homepage.description || homepage.title || '<!-- Add 2-3 sentences on your core product/service here -->',
    '',
    '## Key Facts',
    '<!-- Add 2-3 short, specific facts about your business (founded year, team size, notable clients, etc.) -->',
    '',
    '## Contact',
    `- Website: ${origin}`,
    ''
  );
  return { text: lines.join('\n'), brandName };
}

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service, plan } = auth;

  if (!planAtLeast(plan, 'agency')) {
    return NextResponse.json({ error: 'Website Monitoring is available on the Agency plan.' }, { status: 403 });
  }

  const { data: monitor } = await service
    .from('project_monitors')
    .select('target_url')
    .eq('project_id', projectId)
    .maybeSingle();
  if (!monitor) {
    return NextResponse.json({ error: 'Set up monitoring for this project first.' }, { status: 400 });
  }

  let origin: string;
  try {
    origin = new URL(monitor.target_url).origin;
  } catch {
    return NextResponse.json({ error: 'Invalid target URL on this monitor' }, { status: 400 });
  }

  const homepage = await fetchPageSummary(`${origin}/`);
  if (!homepage) {
    return NextResponse.json({ error: 'Could not fetch the homepage — is the site publicly accessible?' }, { status: 502 });
  }

  const candidates = await Promise.all(CANDIDATE_PATHS.map((p) => fetchPageSummary(`${origin}${p}`)));
  const keyPages = candidates.filter((p): p is PageSummary => p !== null).slice(0, MAX_KEY_PAGES);

  const { text, brandName } = buildLlmsTxt(origin, homepage, keyPages);
  return NextResponse.json({ llmsTxt: text, brandName });
}
