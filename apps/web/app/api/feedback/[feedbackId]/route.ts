import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  const { feedbackId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();

  // Fetch feedback + project to verify ownership before deleting with service client
  const { data: feedback } = await service
    .from('feedback')
    .select('external_id, project_id, projects(organisation_id)')
    .eq('id', feedbackId)
    .single();

  if (!feedback) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });

  const orgId = (feedback.projects as unknown as { organisation_id: string } | null)?.organisation_id;
  if (orgId) {
    const { data: membership } = await service
      .from('members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organisation_id', orgId)
      .not('accepted_at', 'is', null)
      .single();
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only owners and admins can delete feedback' }, { status: 403 });
    }
  }

  // Delete from ScaleFeedback
  const { error } = await service.from('feedback').delete().eq('id', feedbackId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Delete linked ClickUp task (fire-and-forget)
  if (feedback?.external_id && feedback.project_id) {
    void (async () => {
      try {
        const { data: integration } = await service
          .from('integrations')
          .select('config')
          .eq('project_id', feedback.project_id)
          .eq('type', 'clickup')
          .eq('enabled', true)
          .maybeSingle();

        const token = (integration?.config as Record<string, string>)?.accessToken;
        if (token) {
          await fetch(`https://api.clickup.com/api/v2/task/${feedback.external_id}`, {
            method: 'DELETE',
            headers: { Authorization: token },
          });
        }
      } catch { /* never block on ClickUp cleanup failures */ }
    })();
  }

  return NextResponse.json({ ok: true });
}
