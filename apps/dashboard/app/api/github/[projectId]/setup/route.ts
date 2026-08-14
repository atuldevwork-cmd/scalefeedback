import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface Props { params: Promise<{ projectId: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  const { projectId } = await params;
  const supabase = await createClient();
  const service = createServiceClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const config: Record<string, string> = await req.json();
  const { accessToken, owner, repo } = config;

  if (!accessToken || !owner || !repo) {
    return NextResponse.json({ error: 'Missing required config fields' }, { status: 400 });
  }

  // Fetch existing config so we can delete the old webhook if the repo changed
  const { data: existing } = await service
    .from('integrations')
    .select('config')
    .eq('project_id', projectId)
    .eq('type', 'github')
    .single();

  const existingConfig = (existing?.config ?? {}) as Record<string, string>;
  const repoChanged = existingConfig.owner !== owner || existingConfig.repo !== repo;

  // Delete old webhook if the repo changed
  if (existingConfig.webhookId && repoChanged) {
    await fetch(
      `https://api.github.com/repos/${existingConfig.owner}/${existingConfig.repo}/hooks/${existingConfig.webhookId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' } }
    ).catch(() => {}); // non-fatal
  }

  // Register a new webhook for this repo (only if repo changed or no webhook yet)
  let webhookId: string | undefined = existingConfig.webhookId;
  let webhookSecret: string | undefined = existingConfig.webhookSecret;
  if (!webhookId || repoChanged) {
    webhookSecret = randomBytes(32).toString('hex');
    const webhookEndpoint = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/github`;
    const webhookRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/hooks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'web',
          active: true,
          events: ['issues'],
          config: { url: webhookEndpoint, content_type: 'json', secret: webhookSecret },
        }),
      }
    );

    if (webhookRes.ok) {
      const webhookData = await webhookRes.json();
      webhookId = String(webhookData.id ?? '');
    } else {
      webhookId = undefined;
      webhookSecret = undefined;
    }
    // Webhook registration failure is non-fatal — issue creation still works, just no status sync back
  }

  const finalConfig = {
    ...config,
    ...(webhookId ? { webhookId } : {}),
    ...(webhookSecret ? { webhookSecret } : {}),
  };

  const { error } = await service.from('integrations').upsert(
    {
      project_id: projectId,
      type: 'github',
      enabled: true,
      config: finalConfig,
    },
    { onConflict: 'project_id,type' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: { config: finalConfig } });
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { projectId } = await params;
  const service = createServiceClient();

  const { data: existing } = await service
    .from('integrations')
    .select('config')
    .eq('project_id', projectId)
    .eq('type', 'github')
    .single();

  const existingConfig = (existing?.config ?? {}) as Record<string, string>;

  // Delete the GitHub webhook
  if (existingConfig.webhookId && existingConfig.accessToken && existingConfig.owner && existingConfig.repo) {
    await fetch(
      `https://api.github.com/repos/${existingConfig.owner}/${existingConfig.repo}/hooks/${existingConfig.webhookId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${existingConfig.accessToken}`, Accept: 'application/vnd.github+json' } }
    ).catch(() => {});
  }

  await service.from('integrations').delete().eq('project_id', projectId).eq('type', 'github');

  return NextResponse.json({ ok: true });
}
