import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/projects?clickup=error`);
  }

  // Decode projectId from state
  let projectId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
    projectId = decoded.projectId;
  } catch {
    return NextResponse.redirect(`${appUrl}/projects?clickup=error`);
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://api.clickup.com/api/v2/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.CLICKUP_CLIENT_ID,
      client_secret: process.env.CLICKUP_CLIENT_SECRET,
      code,
      redirect_uri: `${appUrl}/api/clickup/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/projects/${projectId}/settings?clickup=error`);
  }

  const { access_token } = await tokenRes.json();

  // Save to integrations table (service client bypasses RLS — this is a server callback)
  const supabase = createServiceClient();
  await supabase.from('integrations').upsert(
    {
      project_id: projectId,
      type: 'clickup',
      enabled: false,
      config: { accessToken: access_token },
    },
    { onConflict: 'project_id,type' }
  );

  return NextResponse.redirect(
    `${appUrl}/projects/${projectId}/settings?clickup=connected`
  );
}
