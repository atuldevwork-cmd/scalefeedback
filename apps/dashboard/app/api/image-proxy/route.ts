import { NextRequest, NextResponse } from 'next/server';

// html2canvas proxy: GET /api/image-proxy?url=<encoded>
// Returns the image as a base64 string so html2canvas can render
// cross-origin images (TrustIndex CDN, Google logos, etc.) without CORS errors.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) return new NextResponse('Missing url', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return new NextResponse('Only http/https allowed', { status: 400 });
  }

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 Pinmarks-ImageProxy/1.0' },
    });
    if (!resp.ok) return new NextResponse('Upstream error', { status: resp.status });

    const rawContentType = resp.headers.get('content-type') ?? 'image/png';
    const contentType = rawContentType.split(';')[0].trim(); // strip charset/params
    const buffer = await resp.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    return new NextResponse(dataUrl, {
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse('Failed to fetch image', { status: 500 });
  }
}
