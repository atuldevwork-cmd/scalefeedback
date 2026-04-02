import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

  const clientId = process.env.JIRA_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: 'Jira OAuth not configured' }, { status: 500 });

  const state = Buffer.from(JSON.stringify({ projectId })).toString('base64url');
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/jira/callback`;

  const url = new URL('https://auth.atlassian.com/authorize');
  url.searchParams.set('audience', 'api.atlassian.com');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', 'read:jira-work write:jira-work offline_access');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('prompt', 'consent');

  return NextResponse.redirect(url.toString());
}
