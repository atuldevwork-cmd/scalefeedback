import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/monitor-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service, role } = auth;

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Only admins and owners can delete issues.' }, { status: 403 });
  }

  const body: { ids?: string[] } = await request.json().catch(() => ({}));
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
  }

  const { error } = await service
    .from('monitor_issues')
    .delete()
    .eq('project_id', projectId)
    .in('id', body.ids);

  if (error) {
    console.error('[monitor-issue] Bulk delete failed:', error);
    return NextResponse.json({ error: 'Failed to delete issues' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
