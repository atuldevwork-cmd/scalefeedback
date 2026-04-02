import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; guestId: string }> }
) {
  const { projectId, guestId } = await params;
  const supabase = await createClient();
  const service = await createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { data: project } = await service
    .from('projects')
    .select('organisation_id')
    .eq('id', projectId)
    .single();

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const { data: membership } = await service
    .from('members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organisation_id', project.organisation_id)
    .single();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { error } = await service
    .from('project_guests')
    .delete()
    .eq('id', guestId)
    .eq('project_id', projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
