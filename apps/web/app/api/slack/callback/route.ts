import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/projects?slack=error`);
  }

  let projectId: string;
  try {
    projectId = JSON.parse(Buffer.from(state, 'base64url').toString()).projectId;
  } catch {
    return NextResponse.redirect(`${appUrl}/projects?slack=error`);
  }

  const redirectUri = `${appUrl}/api/slack/callback`;
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    client_secret: process.env.SLACK_CLIENT_SECRET!,
    code,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch(`https://slack.com/api/oauth.v2.access?${params}`, {
    method: 'POST',
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.ok) {
    return NextResponse.redirect(`${appUrl}/projects/${projectId}/settings?slack=error`);
  }

  const { access_token, team, incoming_webhook } = tokenData;

  const supabase = await createClient();
  await supabase.from('integrations').upsert(
    {
      project_id: projectId,
      type: 'slack',
      enabled: true,
      config: {
        accessToken: access_token,
        webhookUrl: incoming_webhook.url,
        channel: incoming_webhook.channel,
        workspaceName: team.name,
      },
    },
    { onConflict: 'project_id,type' }
  );

  return NextResponse.redirect(
    `${appUrl}/projects/${projectId}/settings?slack=connected`
  );
}
