import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/monitor-auth';

const VALID_STATUSES = ['open', 'resolved', 'dismissed'] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; issueId: string }> }
) {
  const { projectId, issueId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service, role } = auth;

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Only admins and owners can update issue status.' }, { status: 403 });
  }

  const body: { status?: string } = await request.json().catch(() => ({}));
  if (!body.status || !VALID_STATUSES.includes(body.status as typeof VALID_STATUSES[number])) {
    return NextResponse.json({ error: 'status must be one of: open, resolved, dismissed' }, { status: 400 });
  }

  const { error } = await service
    .from('monitor_issues')
    .update({
      status: body.status,
      resolved_at: body.status === 'resolved' ? new Date().toISOString() : null,
    })
    .eq('id', issueId)
    .eq('project_id', projectId);

  if (error) {
    console.error('[monitor-issue] Update failed:', error);
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; issueId: string }> }
) {
  const { projectId, issueId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service, role } = auth;

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Only admins and owners can delete issues.' }, { status: 403 });
  }

  const { error } = await service
    .from('monitor_issues')
    .delete()
    .eq('id', issueId)
    .eq('project_id', projectId);

  if (error) {
    console.error('[monitor-issue] Delete failed:', error);
    return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
