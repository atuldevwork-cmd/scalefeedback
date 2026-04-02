import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendStatusChangeEmail } from '@/lib/email';
import { logActivity } from '@/lib/activity-log';
import { notifyOrgMembers, notifyProjectGuests } from '@/lib/notifications';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  const { feedbackId } = await params;
  const { status: newStatus } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();

  const { data: feedback } = await service
    .from('feedback')
    .select('*, projects(id, name, organisation_id)')
    .eq('id', feedbackId)
    .single();
  if (!feedback) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const oldStatus = feedback.status;
  const { error } = await supabase.from('feedback').update({ status: newStatus }).eq('id', feedbackId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const projectRaw = feedback.projects;
  const project = (Array.isArray(projectRaw) ? projectRaw[0] : projectRaw) as { id: string; name: string; organisation_id: string } | null;

  // Log activity
  void logActivity(supabase, {
    feedbackId,
    actor: 'Team',
    action: 'status.changed',
    metadata: { to: newStatus },
  });

  // Notifications + emails (fire-and-forget)
  void (async () => {
    try {
      if (!project) return;
      const feedbackTitle = feedback.title ?? feedback.page_url ?? 'Feedback';
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project.id}/${feedbackId}`;
      const guestUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guest/${project.id}/${feedbackId}`;
      const label = newStatus.replace(/_/g, ' ');

      const { data: usersResp } = await service.auth.admin.listUsers();

      // In-app: all org members (except who made the change)
      await notifyOrgMembers(service, project.organisation_id, user.id, {
        type: 'status_change',
        title: `Status changed to "${label}"`,
        body: feedbackTitle,
        feedbackId,
        projectId: project.id,
      });

      // In-app: project guests
      await notifyProjectGuests(service, project.id, user.id, {
        type: 'status_change',
        title: `Status changed to "${label}"`,
        body: feedbackTitle,
        feedbackId,
        projectId: project.id,
      });

      // Email: assignee
      if (feedback.assigned_to && feedback.assigned_to !== user.id) {
        const assignee = usersResp?.users.find((u) => u.id === feedback.assigned_to);
        if (assignee?.email) {
          void sendStatusChangeEmail({
            to: assignee.email,
            projectName: project.name,
            feedbackTitle,
            oldStatus,
            newStatus,
            dashboardUrl,
          });
        }
      }

      // Email: reporter
      if (feedback.reporter_email) {
        void sendStatusChangeEmail({
          to: feedback.reporter_email,
          projectName: project.name,
          feedbackTitle,
          oldStatus,
          newStatus,
          dashboardUrl: guestUrl,
        });
      }
    } catch { /* never break on notification failures */ }
  })();

  return NextResponse.json({ ok: true });
}
