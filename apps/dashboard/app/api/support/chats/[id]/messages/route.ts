import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient, createServiceClient } from '@/lib/supabase/server';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SUPPORT_PROMPT = `You are a helpful, friendly support assistant for Pinmarks — a visual feedback and bug-reporting SaaS for product teams.

Pinmarks lets teams embed a widget on their site to collect feedback, bug reports, and suggestions. The widget captures screenshots, console logs, and browser metadata automatically. Teams can integrate with Jira, GitHub, Slack, and ClickUp. There's also an AI-powered website scanner.

Help users with:
- Installing and configuring the widget (embed script or npm package)
- Managing feedback submissions and projects
- Setting up integrations (Jira, GitHub, Slack, ClickUp)
- Inviting team members and managing guest access
- Understanding the AI scan feature
- Billing and plan questions

Keep answers concise and actionable. If you cannot fully resolve an issue, tell the user they can click the "Connect with team member" button at the bottom of this chat to be connected with a real team member instantly — do NOT tell them to visit an external page or contact form.

Format responses clearly: use **bold** for section headings, plain numbered lines (1. 2. 3.) with a newline before each step, and no other markdown. Keep responses short and scannable.`;

function wantsHuman(message: string): boolean {
  const lower = message.toLowerCase();
  return [
    'talk to a human', 'human support', 'connect with team', 'speak to someone',
    'real person', 'live agent', 'speak with team', 'contact support',
    'talk to someone', 'speak with a person', 'connect me with',
    'want to talk', 'need human', 'escalate', 'team member',
    'connect with a team', 'i\'d like to connect',
  ].some((kw) => lower.includes(kw));
}

// GET /api/support/chats/[id]/messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { id } = await params;
  const service = createServiceClient();
  const { data, error } = await service
    .from('support_messages')
    .select('id, role, sender_id, content, created_at')
    .eq('chat_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// POST /api/support/chats/[id]/messages
// Returns { data: { userMessage, botMessage } } — bot response is awaited here
// so the serverless function doesn't get killed before OpenAI responds.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { id } = await params;
  const service = createServiceClient();
  const { content } = await req.json() as { content: string };

  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const { data: chat } = await service
    .from('support_chats')
    .select('id, status, user_id')
    .eq('id', id)
    .single();

  if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

  const isOwner = chat.user_id === user.id;
  if (!isOwner) {
    const { data: agentRow } = await service
      .from('support_agents')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!agentRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const role = isOwner ? 'user' : 'agent';

  let senderName: string | null = null;
  if (role === 'agent') {
    const { data: profile } = await service
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
    senderName = profile?.full_name ?? user.email?.split('@')[0] ?? null;
  }

  const { data: userMessage, error } = await service
    .from('support_messages')
    .insert({ chat_id: id, role, sender_id: user.id, sender_name: senderName, content: content.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Agent reply: mark chat as with_human
  if (role === 'agent' && chat.status !== 'with_human') {
    await service
      .from('support_chats')
      .update({ status: 'with_human', agent_id: user.id })
      .eq('id', id);
  }

  // User message while bot is active: generate bot reply synchronously
  // (awaited so the response includes the bot message and can't be killed early)
  let botMessage = null;
  if (role === 'user' && chat.status === 'bot') {
    try {
      if (wantsHuman(content)) {
        await service.from('support_chats').update({ status: 'waiting_human' }).eq('id', id);
        const { data: bm } = await service.from('support_messages').insert({
          chat_id: id,
          role: 'bot',
          sender_id: null,
          content: "I've notified our team and someone will join this chat shortly. In the meantime, feel free to describe your issue in more detail.",
        }).select().single();
        botMessage = bm;
      } else {
        const { data: history } = await service
          .from('support_messages')
          .select('role, content')
          .eq('chat_id', id)
          .order('created_at', { ascending: true });

        const openaiHistory = (history ?? []).map((m: { role: string; content: string }) => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.content,
        }));

        const completion = await getOpenAI().chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 500,
          messages: [{ role: 'system', content: SUPPORT_PROMPT }, ...openaiHistory],
        });

        const botContent = completion.choices[0].message.content?.trim()
          ?? "I'm having trouble responding right now. Please try again or connect with our team.";

        const { data: bm } = await service.from('support_messages').insert({
          chat_id: id,
          role: 'bot',
          sender_id: null,
          content: botContent,
        }).select().single();
        botMessage = bm;
      }
    } catch (err) {
      console.error('Support bot error:', err);
      const { data: bm } = await service.from('support_messages').insert({
        chat_id: id,
        role: 'bot',
        sender_id: null,
        content: "I'm having trouble responding right now. Please try again or connect with our team.",
      }).select().single();
      botMessage = bm;
    }
  }

  return NextResponse.json({ data: { userMessage, botMessage } }, { status: 201 });
}
