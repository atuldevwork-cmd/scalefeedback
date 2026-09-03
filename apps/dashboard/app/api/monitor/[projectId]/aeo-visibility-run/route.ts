import { NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/monitor-auth';
import { planAtLeast } from '@/lib/plan';

export const dynamic = 'force-dynamic';

// Triggers an AI Visibility run (aeo.md Module B, manual-trigger phase) —
// queues a row in aeo_visibility_runs for apps/worker to pick up and
// process (every configured prompt × every engine with a configured API
// key). Real, metered API cost per call — deliberately manual, not
// scheduled, matching the spec's Phase 2 build order.
export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service, role, plan } = auth;

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Only admins and owners can run an AI Visibility check.' }, { status: 403 });
  }
  if (!planAtLeast(plan, 'agency')) {
    return NextResponse.json({ error: 'Website Monitoring is available on the Agency plan.' }, { status: 403 });
  }

  const { data: monitor } = await service.from('project_monitors').select('id').eq('project_id', projectId).maybeSingle();
  if (!monitor) return NextResponse.json({ error: 'Set up monitoring for this project first.' }, { status: 400 });

  const { count: promptCount } = await service
    .from('aeo_prompts')
    .select('id', { count: 'exact', head: true })
    .eq('monitor_id', monitor.id);
  if (!promptCount) {
    return NextResponse.json({ error: 'Add at least one prompt before running an AI Visibility check.' }, { status: 400 });
  }

  // Don't stack a second run on top of one already pending/running — same
  // guard used for the worker's other background job types.
  const { data: activeRun } = await service
    .from('aeo_visibility_runs')
    .select('id')
    .eq('monitor_id', monitor.id)
    .in('status', ['pending', 'running'])
    .limit(1)
    .maybeSingle();
  if (activeRun) return NextResponse.json({ ok: true, alreadyRunning: true });

  const { error: insertError } = await service
    .from('aeo_visibility_runs')
    .insert({ monitor_id: monitor.id, project_id: projectId });
  if (insertError) {
    console.error('[aeo-visibility-run] Failed to queue run:', insertError);
    return NextResponse.json({ error: 'Failed to queue AI Visibility run' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Polled by the client — returns the most recent run (whatever its status)
// plus its results-so-far, joined with prompt text so the UI doesn't need a
// second round trip. Results stream in as the worker inserts them, same
// "watch it happen live" pattern as the other background checks.
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service } = auth;

  const { data: monitor } = await service.from('project_monitors').select('id').eq('project_id', projectId).maybeSingle();
  if (!monitor) return NextResponse.json({ run: null, results: [] });

  const { data: run } = await service
    .from('aeo_visibility_runs')
    .select('id, status, total_calls, completed_calls, error, created_at, completed_at')
    .eq('monitor_id', monitor.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!run) return NextResponse.json({ run: null, results: [] });

  const { data: results } = await service
    .from('aeo_prompt_results')
    .select('id, engine, run_at, cited_urls, brand_mentioned, brand_cited, position, competitors_mentioned, sentiment_score, sentiment_justification, error, prompt_id, aeo_prompts(prompt_text)')
    .eq('run_id', run.id)
    .order('run_at', { ascending: true });

  return NextResponse.json({ run, results: results ?? [] });
}
