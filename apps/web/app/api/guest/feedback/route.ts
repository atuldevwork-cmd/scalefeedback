import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'wont_fix'];

// PATCH /api/guest/feedback  body: { feedback_id, status }
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { feedback_id, status } = await req.json();
  if (!feedback_id || !status) {
    return NextResponse.json({ error: 'feedback_id and status required' }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const service = createServiceClient();

  // Get feedback + project
  const { data: feedback } = await service
    .from('feedback')
    .select('id, project_id, projects(id, organisation_id)')
    .eq('id', feedback_id)
    .single();

  if (!feedback) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const projectRaw = feedback.projects;
  const project = (Array.isArray(projectRaw) ? projectRaw[0] : projectRaw) as { id: string; organisation_id: string } | null;
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Verify guest or member access
  const [{ data: guestAccess }, { data: membership }] = await Promise.all([
    service
      .from('project_guests')
      .select('id')
      .eq('project_id', project.id)
      .eq('email', user.email ?? '')
      .not('accepted_at', 'is', null)
      .single(),
    service
      .from('members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organisation_id', project.organisation_id)
      .single(),
  ]);

  if (!guestAccess && !membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const { error } = await service
    .from('feedback')
    .update({ status })
    .eq('id', feedback_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
