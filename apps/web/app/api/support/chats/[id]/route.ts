import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// PATCH /api/support/chats/[id]  — update status or claim as agent
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { id } = await params;
  const service = createServiceClient();
  const body = await req.json() as { status?: string; agent_id?: string | null };

  const update: Record<string, string | null> = {};
  if (body.status) update.status = body.status;
  if (body.agent_id !== undefined) update.agent_id = body.agent_id;

  const { data: chat, error } = await service
    .from('support_chats')
    .update(update)
    .eq('id', id)
    .select('id, user_id, user_name, user_email, status')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify all support agents when user requests human support (fire-and-forget)
  if (body.status === 'waiting_human' && chat?.user_id) {
    void (async () => {
      try {
        const { data: agents } = await service
          .from('support_agents')
          .select('user_id');

        const targets = (agents ?? [])
          .map((a: { user_id: string }) => a.user_id)
          .filter((id: string) => id !== chat.user_id);

        if (!targets.length) return;

        const userName = chat.user_name ?? chat.user_email ?? 'A user';
        await service.from('notifications').insert(
          targets.map((userId: string) => ({
            user_id: userId,
            type: 'support_chat',
            title: `${userName} wants to chat with the team`,
            body: 'Open Support Inbox to respond.',
          }))
        );
      } catch { /* never block on notification failures */ }
    })();
  }

  return NextResponse.json({ data: chat });
}
