import { NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/monitor-auth';

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string; promptId: string }> }) {
  const { projectId, promptId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service, role } = auth;

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Only admins and owners can manage AI Visibility prompts.' }, { status: 403 });
  }

  // Scoped by project_id too, not just id — a prompt id belonging to a
  // different project can't be deleted through this route even if guessed.
  const { error } = await service.from('aeo_prompts').delete().eq('id', promptId).eq('project_id', projectId);
  if (error) {
    console.error('[aeo-prompts] Failed to delete prompt:', error);
    return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
