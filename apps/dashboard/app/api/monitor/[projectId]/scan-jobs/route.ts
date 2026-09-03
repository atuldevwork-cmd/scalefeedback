import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/monitor-auth';

export const dynamic = 'force-dynamic';

// Two independent check types can each have their own job in flight at once
// (broken_links and page_speed) — default to 'broken_links' so the existing
// UI section (which predates page_speed) doesn't need to change.
function checkTypeFrom(request: NextRequest): string {
  return request.nextUrl.searchParams.get('check_type') ?? 'broken_links';
}

// Polled by monitor-client.tsx while a background check is running —
// returns the latest job of the requested check_type for this project's
// monitor so the UI can show progress and know when to refresh the issues
// list. See apps/worker/src/index.ts for what actually updates these rows.
export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service } = auth;
  const checkType = checkTypeFrom(request);

  const columns = 'id, check_type, status, pages_crawled, links_checked, issues_found, error, phases, created_at, completed_at';

  // Prefer the job that's actually running — if a rescan got triggered while
  // one was already in flight, the newest row by created_at can be a
  // still-queued duplicate sitting behind the real in-progress one, which
  // would otherwise show a bare "queued…" message instead of real progress.
  const { data: runningJob } = await service
    .from('monitor_scan_jobs')
    .select(columns)
    .eq('project_id', projectId)
    .eq('check_type', checkType)
    .eq('status', 'running')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const job = runningJob ?? (
    await service
      .from('monitor_scan_jobs')
      .select(columns)
      .eq('project_id', projectId)
      .eq('check_type', checkType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ).data;

  return NextResponse.json({ job: job ?? null });
}

// Stops the active scan (of the requested check_type) for this project. A
// still-'pending' job (not yet claimed by the worker) can be cancelled
// outright. A 'running' job gets flipped to 'cancelling' instead — only the
// worker process actually running that crawl knows when it's safe to call it
// stopped, so it checks for this signal itself (see isJobCancelling in
// apps/worker/src/index.ts) and flips the job to 'cancelled' once it has
// unwound.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service, role } = auth;
  const checkType = checkTypeFrom(request);

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Only admins and owners can stop a scan.' }, { status: 403 });
  }

  const { data: cancelledPending } = await service
    .from('monitor_scan_jobs')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('check_type', checkType)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (cancelledPending) return NextResponse.json({ ok: true });

  const { data: cancellingRunning } = await service
    .from('monitor_scan_jobs')
    .update({ status: 'cancelling' })
    .eq('project_id', projectId)
    .eq('check_type', checkType)
    .eq('status', 'running')
    .select('id')
    .maybeSingle();
  if (!cancellingRunning) return NextResponse.json({ error: 'No active scan to stop.' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
