import { NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/monitor-auth';

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string; competitorId: string }> }) {
  const { projectId, competitorId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service, role } = auth;

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Only admins and owners can manage AI Visibility competitors.' }, { status: 403 });
  }

  const { error } = await service.from('aeo_competitors').delete().eq('id', competitorId).eq('project_id', projectId);
  if (error) {
    console.error('[aeo-competitors] Failed to delete competitor:', error);
    return NextResponse.json({ error: 'Failed to delete competitor' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
