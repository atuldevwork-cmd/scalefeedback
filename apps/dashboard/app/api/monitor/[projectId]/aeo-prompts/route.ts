import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/monitor-auth';
import { planAtLeast } from '@/lib/plan';

export const dynamic = 'force-dynamic';

// Prompts a monitor's AI Visibility check runs against each engine (aeo.md
// Module B) — e.g. "best CRM for startups". Manual list, no auto-discovery
// (per the spec's own MVP note: "start with a small fixed prompt set,
// user-editable, rather than auto-discovering all possible prompts").
export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service } = auth;

  const { data: monitor } = await service.from('project_monitors').select('id').eq('project_id', projectId).maybeSingle();
  if (!monitor) return NextResponse.json({ prompts: [] });

  const { data } = await service
    .from('aeo_prompts')
    .select('id, prompt_text, created_at')
    .eq('monitor_id', monitor.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ prompts: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service, role, plan } = auth;

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Only admins and owners can manage AI Visibility prompts.' }, { status: 403 });
  }
  if (!planAtLeast(plan, 'agency')) {
    return NextResponse.json({ error: 'Website Monitoring is available on the Agency plan.' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const promptText = typeof body.prompt_text === 'string' ? body.prompt_text.trim() : '';
  if (!promptText) return NextResponse.json({ error: 'prompt_text is required' }, { status: 400 });
  if (promptText.length > 500) return NextResponse.json({ error: 'Prompt is too long (max 500 characters)' }, { status: 400 });

  const { data: monitor } = await service.from('project_monitors').select('id').eq('project_id', projectId).maybeSingle();
  if (!monitor) return NextResponse.json({ error: 'Set up monitoring for this project first.' }, { status: 400 });

  const { data, error } = await service
    .from('aeo_prompts')
    .insert({ monitor_id: monitor.id, project_id: projectId, prompt_text: promptText })
    .select('id, prompt_text, created_at')
    .single();
  if (error) {
    console.error('[aeo-prompts] Failed to insert prompt:', error);
    return NextResponse.json({ error: 'Failed to save prompt' }, { status: 500 });
  }

  return NextResponse.json({ prompt: data });
}
