import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/projects?github=error`);
  }

  let projectId: string;
  try {
    projectId = JSON.parse(Buffer.from(state, 'base64url').toString()).projectId;
  } catch {
    return NextResponse.redirect(`${appUrl}/projects?github=error`);
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${appUrl}/api/github/callback`,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${appUrl}/projects/${projectId}/settings?github=error`);
  }

  // Get the authenticated user's login for display
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github+json' },
  });
  const userData = await userRes.json();

  const supabase = await createClient();
  await supabase.from('integrations').upsert(
    {
      project_id: projectId,
      type: 'github',
      enabled: false,
      config: {
        accessToken: tokenData.access_token,
        githubLogin: userData.login ?? '',
      },
    },
    { onConflict: 'project_id,type' }
  );

  return NextResponse.redirect(
    `${appUrl}/projects/${projectId}/settings?github=connected`
  );
}
