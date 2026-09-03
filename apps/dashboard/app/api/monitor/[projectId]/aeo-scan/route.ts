import { NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/monitor-auth';
import { planAtLeast } from '@/lib/plan';

export const dynamic = 'force-dynamic';

// Queues an AEO (Answer/AI-search Engine Optimization) check — entirely
// deterministic (robots.txt AI-crawler blocks, llms.txt, per-page schema/
// content signals, see apps/worker/src/aeo.ts), no AI model call — as its
// own background job, same pattern as page-speed-scan/route.ts. It's
// bundled into the "SEO & AI-search" checkbox on a normal scan too, but also
// gets its own manual re-run button here since it can be worth re-checking
// on its own (e.g. right after editing robots.txt).
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

  // Don't stack a second AEO job on top of one already pending/running —
  // same reasoning as the broken_links/page_speed dedup guards elsewhere.
  const { data: activeJob } = await service
    .from('monitor_scan_jobs')
    .select('id')
    .eq('monitor_id', monitor.id)
    .eq('check_type', 'aeo')
    .in('status', ['pending', 'running', 'cancelling'])
    .limit(1)
    .maybeSingle();
  if (activeJob) return NextResponse.json({ ok: true, alreadyRunning: true });

  const { error: jobError } = await service
    .from('monitor_scan_jobs')
    .insert({ monitor_id: monitor.id, project_id: projectId, check_type: 'aeo' });
  if (jobError) {
    console.error('[aeo-scan] Failed to queue job:', jobError);
    return NextResponse.json({ error: 'Failed to queue AEO check' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
