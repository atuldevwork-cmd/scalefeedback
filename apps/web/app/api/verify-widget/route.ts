import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const key = searchParams.get('key');

  if (!url || !key) {
    return NextResponse.json({ found: false, error: 'Missing url or key' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ScaleFeedback-Verifier/1.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return NextResponse.json({ found: false });

    const html = await res.text();
    const found = html.includes('widget.js') && html.includes(key);
    return NextResponse.json({ found });
  } catch {
    return NextResponse.json({ found: false });
  }
}
