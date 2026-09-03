import { NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/monitor-auth';
import { planAtLeast } from '@/lib/plan';

export const dynamic = 'force-dynamic';

// Queues a Page Speed check (Google PageSpeed Insights, one call per page —
// see apps/worker/src/pagespeed.ts) as its own background job, separate
// from the "Scan now" flow. It's opt-in and deliberately not bundled into
// interested_check/the general rescan: a real per-page Lighthouse audit is
// slow (~10s/page) even in parallel, so it's triggered by its own button
// with its own time estimate rather than silently tacked onto every scan.
export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service, role, plan } = auth;

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Only admins and owners can run a scan.' }, { status: 403 });
  }
  if (!planAtLeast(plan, 'agency')) {
    return NextResponse.json({ error: 'Website Monitoring is available on the Agency plan.' }, { status: 403 });
  }

  const { data: monitor } = await service
    .from('project_monitors')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();
  if (!monitor) {
    return NextResponse.json({ error: 'Set up monitoring for this project first.' }, { status: 400 });
  }

  // Don't stack a second page-speed job on top of one already pending/running
  // — same reasoning as the broken_links dedup guard in scan/route.ts.
  const { data: activeJob } = await service
    .from('monitor_scan_jobs')
    .select('id')
    .eq('monitor_id', monitor.id)
    .eq('check_type', 'page_speed')
    .in('status', ['pending', 'running', 'cancelling'])
    .limit(1)
    .maybeSingle();
  if (activeJob) return NextResponse.json({ ok: true, alreadyRunning: true });

  const { error: jobError } = await service
    .from('monitor_scan_jobs')
    .insert({ monitor_id: monitor.id, project_id: projectId, check_type: 'page_speed' });
  if (jobError) {
    console.error('[page-speed-scan] Failed to queue job:', jobError);
    return NextResponse.json({ error: 'Failed to queue page speed check' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
