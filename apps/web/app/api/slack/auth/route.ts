import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: 'Slack OAuth not configured' }, { status: 500 });

  const state = Buffer.from(JSON.stringify({ projectId })).toString('base64url');
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/callback`;

  const url = new URL('https://slack.com/oauth/v2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', 'incoming-webhook');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);

  return NextResponse.redirect(url.toString());
}
