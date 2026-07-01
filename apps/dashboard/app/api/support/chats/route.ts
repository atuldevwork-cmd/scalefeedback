import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/support/chats?scope=inbox  — team inbox (all open chats)
// GET /api/support/chats               — current user's open chat (or null)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const service = createServiceClient();
  const scope = new URL(req.url).searchParams.get('scope');

  if (scope === 'inbox') {
    const { data: agent } = await service
      .from('support_agents')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!agent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await service
      .from('support_chats')
      .select('id, user_name, user_email, status, agent_id, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  }

  if (scope === 'waiting-count') {
    const { count, error } = await service
      .from('support_chats')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting_human');

    if (error) return NextResponse.json({ count: 0 });
    return NextResponse.json({ count: count ?? 0 });
  }

  const { data } = await service
    .from('support_chats')
    .select('id, status, agent_id, created_at')
    .eq('user_id', user.id)
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ data: data ?? null });
}

// POST /api/support/chats  — get-or-create the user's open chat
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const service = createServiceClient();

  // Return existing open chat if one exists
  const { data: existing } = await service
    .from('support_chats')
    .select('id, status')
    .eq('user_id', user.id)
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return NextResponse.json({ data: existing });

  const { data: userData } = await service.auth.admin.getUserById(user.id);
  const u = userData?.user;
  const userName = u?.user_metadata?.full_name ?? u?.user_metadata?.name ?? u?.email ?? 'User';
  const userEmail = u?.email ?? '';

  const { data: chat, error } = await service
    .from('support_chats')
    .insert({ user_id: user.id, user_name: userName, user_email: userEmail, status: 'bot' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await service.from('support_messages').insert({
    chat_id: chat.id,
    role: 'bot',
    sender_id: null,
    content: "Hi! 👋 I'm the Pinmarks support assistant. How can I help you today? I can help with the widget setup, integrations, managing feedback, and more.",
  });

  return NextResponse.json({ data: chat }, { status: 201 });
}
