import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

  const clientId = process.env.CLICKUP_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: 'ClickUp OAuth not configured' }, { status: 500 });

  const state = Buffer.from(JSON.stringify({ projectId })).toString('base64url');
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/clickup/callback`;

  const url = new URL('https://app.clickup.com/api');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);

  return NextResponse.redirect(url.toString());
}
