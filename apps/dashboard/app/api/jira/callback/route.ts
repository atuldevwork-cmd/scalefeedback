import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/projects?jira=error`);
  }

  let projectId: string;
  try {
    projectId = JSON.parse(Buffer.from(state, 'base64url').toString()).projectId;
  } catch {
    return NextResponse.redirect(`${appUrl}/projects?jira=error`);
  }

  const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      code,
      redirect_uri: `${appUrl}/api/jira/callback`,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${appUrl}/projects/${projectId}/settings?jira=error`);
  }

  const supabase = await createClient();
  await supabase.from('integrations').upsert(
    {
      project_id: projectId,
      type: 'jira',
      enabled: true,
      config: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? '',
      },
    },
    { onConflict: 'project_id,type' }
  );

  return NextResponse.redirect(
    `${appUrl}/projects/${projectId}/settings?jira=connected`
  );
}
