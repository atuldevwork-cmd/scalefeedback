import { NextRequest, NextResponse } from 'next/server';
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
  const { accessToken, workspaceId, listId } = config;

  if (!accessToken || !workspaceId || !listId) {
    return NextResponse.json({ error: 'Missing required config fields' }, { status: 400 });
  }

  // Fetch existing config so we can delete the old webhook if it changed
  const { data: existing } = await service
    .from('integrations')
    .select('config')
    .eq('project_id', projectId)
    .eq('type', 'clickup')
    .single();

  const existingConfig = (existing?.config ?? {}) as Record<string, string>;

  // Delete old ClickUp webhook if list changed
  if (existingConfig.webhookId && existingConfig.listId !== listId) {
    await fetch(
      `https://api.clickup.com/api/v2/webhook/${existingConfig.webhookId}`,
      { method: 'DELETE', headers: { Authorization: accessToken } }
    ).catch(() => {}); // non-fatal
  }

  // Register a new ClickUp webhook for this list (only if list changed or no webhook yet)
  let webhookId = existingConfig.webhookId;
  if (!webhookId || existingConfig.listId !== listId) {
    const webhookEndpoint = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/clickup`;
    const webhookRes = await fetch(
      `https://api.clickup.com/api/v2/team/${workspaceId}/webhook`,
      {
        method: 'POST',
        headers: { Authorization: accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: webhookEndpoint,
          events: ['taskStatusUpdated', 'taskCommentPosted'],
          list_id: listId,
        }),
      }
    );

    if (webhookRes.ok) {
      const webhookData = await webhookRes.json();
      webhookId = webhookData.webhook?.id ?? webhookData.id ?? undefined;
    }
    // Webhook registration failure is non-fatal — sync just won't work
  }

  const finalConfig = { ...config, ...(webhookId ? { webhookId } : {}) };

  const { error } = await service.from('integrations').upsert(
    {
      project_id: projectId,
      type: 'clickup',
      enabled: true,
      config: finalConfig,
    },
    { onConflict: 'project_id,type' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: { config: finalConfig } });
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const { projectId } = await params;
  const service = createServiceClient();

  const { data: existing } = await service
    .from('integrations')
    .select('config')
    .eq('project_id', projectId)
    .eq('type', 'clickup')
    .single();

  const existingConfig = (existing?.config ?? {}) as Record<string, string>;

  // Delete the ClickUp webhook
  if (existingConfig.webhookId && existingConfig.accessToken) {
    await fetch(
      `https://api.clickup.com/api/v2/webhook/${existingConfig.webhookId}`,
      { method: 'DELETE', headers: { Authorization: existingConfig.accessToken } }
    ).catch(() => {});
  }

  await service.from('integrations').delete().eq('project_id', projectId).eq('type', 'clickup');

  return NextResponse.json({ ok: true });
}
