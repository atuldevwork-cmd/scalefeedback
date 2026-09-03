import { NextRequest, NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';
import { readFileSync } from 'fs';
import path from 'path';
import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { getBrowser } from '@/lib/browser';
import { isSafeFetchTarget } from '@/lib/ssrf-guard';
import { sanitizeSnapshotTree, type RawNode } from '@/lib/snapshot-sanitize';
import type { RenderSnapshotRequest } from '@pinmarks/shared';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const RENDER_TIMEOUT_MS = 15_000;
const ALLOWED_RESOURCE_TYPES = new Set(['image', 'stylesheet', 'font']);

// Vendored locally (lib/vendor/) rather than read from node_modules via
// require.resolve() — Next.js bundles this route through webpack, which
// rewrites import.meta.url into a virtual module path that breaks
// require.resolve() against it, and Vercel's build-time file tracer isn't
// guaranteed to pick up a node_modules asset that's only ever reached via a
// runtime fs.readFileSync. A path anchored at process.cwd() (this app's real
// on-disk root) plus outputFileTracingIncludes (next.config.mjs) for this
// route is the robust way to ship an extra static asset alongside a
// serverless function.
let _rrwebSnapshotSrc: string | undefined;
function getRrwebSnapshotSource(): string {
  if (_rrwebSnapshotSrc !== undefined) return _rrwebSnapshotSrc;
  _rrwebSnapshotSrc = readFileSync(path.join(process.cwd(), 'lib/vendor/rrweb-snapshot.min.js'), 'utf8');
  return _rrwebSnapshotSrc;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function withCors(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', '*');
  return res;
}

interface BasicAuthCreds {
  username: string;
  password: string;
}

async function renderScreenshot(
  tree: RawNode,
  viewportWidth: number,
  viewportHeight: number,
  scrollX: number,
  scrollY: number,
  dpr: number,
  basicAuth?: BasicAuthCreds,
): Promise<Buffer> {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    // Sub-resources (images/fonts/stylesheets) referenced by the rebuilt DOM are
    // fetched for real below — if the site sits behind HTTP Basic Auth, those
    // requests 401 without this (showing as broken images in the screenshot).
    if (basicAuth) await page.authenticate(basicAuth);
    await page.setViewport({ width: viewportWidth, height: viewportHeight, deviceScaleFactor: dpr || 1 });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      void (async () => {
        try {
          if (req.url() === 'about:blank') { await req.continue(); return; }
          if (!ALLOWED_RESOURCE_TYPES.has(req.resourceType())) { await req.abort(); return; }
          const safe = await isSafeFetchTarget(req.url());
          if (safe) await req.continue(); else await req.abort();
        } catch { /* request may already be handled/closed */ }
      })();
    });

    await page.goto('about:blank');

    // Trusted, our-own-code injection — runs BEFORE we disable JS below.
    await page.addScriptTag({ content: getRrwebSnapshotSource() });
    await page.evaluate((serializedTree) => {
      const rrwebSnapshot = (window as unknown as {
        rrwebSnapshot: {
          rebuild: (n: unknown, opts: { doc: Document; cache: unknown; hackCss: boolean }) => unknown;
          createCache: () => unknown;
        };
      }).rrwebSnapshot;
      const cache = rrwebSnapshot.createCache();
      rrwebSnapshot.rebuild(serializedTree, { doc: document, cache, hackCss: true });
    }, tree);

    await page.evaluate((x, y) => window.scrollTo(x, y), scrollX, scrollY);

    // No further script execution past this point — the rebuilt tree is
    // already sanitized (no <script>, no on* handlers), this just closes
    // off anything that slipped through (e.g. a scheduled timer).
    await page.setJavaScriptEnabled(false);

    await page.waitForNetworkIdle({ idleTime: 200, timeout: 3_000 }).catch(() => { /* best effort */ });

    const raw = await page.screenshot({ type: 'png' });
    return Buffer.isBuffer(raw) ? raw : Buffer.from(raw as Uint8Array);
  } finally {
    await browser.close();
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
    const rl = rateLimit(`render-snapshot:${ip}`, 8, 60_000);
    if (!rl.ok) {
      return withCors(NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, {
        status: 429,
        headers: { 'Retry-After': '60' },
      }));
    }

    const body: RenderSnapshotRequest = await request.json();

    const supabase = await createServiceClient();
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, is_active, widget_config, basic_auth_username, basic_auth_password')
      .eq('api_key', body.project_api_key)
      .single();

    if (projectError || !project) {
      return withCors(NextResponse.json({ error: 'Invalid API key' }, { status: 401 }));
    }
    if (!project.is_active) {
      return withCors(NextResponse.json({ error: 'Project is inactive' }, { status: 403 }));
    }

    const widgetCfg = (project.widget_config ?? {}) as Record<string, unknown>;
    const basicAuth: BasicAuthCreds | undefined = widgetCfg.basicAuthEnabled && project.basic_auth_username && project.basic_auth_password
      ? { username: project.basic_auth_username, password: project.basic_auth_password }
      : undefined;

    if (!body.dom_snapshot_gz || !body.viewport_width || !body.viewport_height) {
      return withCors(NextResponse.json({ error: 'Missing snapshot data' }, { status: 400 }));
    }

    let tree: RawNode;
    try {
      const buf = Buffer.from(body.dom_snapshot_gz, 'base64');
      tree = JSON.parse(gunzipSync(buf).toString('utf-8'));
    } catch {
      return withCors(NextResponse.json({ error: 'Malformed snapshot payload' }, { status: 400 }));
    }

    const sanitized = sanitizeSnapshotTree(tree);

    const pngBuffer = await Promise.race([
      renderScreenshot(
        sanitized,
        body.viewport_width,
        body.viewport_height,
        body.scroll_x ?? 0,
        body.scroll_y ?? 0,
        body.device_pixel_ratio ?? 1,
        basicAuth,
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Render timed out')), RENDER_TIMEOUT_MS)
      ),
    ]);

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('render-snapshot API error:', error);
    return withCors(NextResponse.json({ error: 'Render failed' }, { status: 500 }));
  }
}
