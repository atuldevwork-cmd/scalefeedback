import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { notifyOrgMembers, notifyProjectGuests } from '@/lib/notifications';
import { sendGuestCommentEmail } from '@/lib/email';

// POST /api/comments  — team member comment, triggers notifications
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { feedback_id, body, is_internal } = await req.json();
  if (!feedback_id || !body?.trim()) {
    return NextResponse.json({ error: 'feedback_id and body required' }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: feedback } = await service
    .from('feedback')
    .select('id, title, page_url, project_id, assigned_to, reporter_email, external_id, projects(id, name, organisation_id)')
    .eq('id', feedback_id)
    .single();

  if (!feedback) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const projectRaw = feedback.projects;
  const project = (Array.isArray(projectRaw) ? projectRaw[0] : projectRaw) as { id: string; name: string; organisation_id: string } | null;
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({ feedback_id, user_id: user.id, body: body.trim(), is_internal: !!is_internal })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync comment to ClickUp (fire-and-forget)
  if (feedback.external_id) {
    void (async () => {
      try {
        const { data: cuIntegration } = await service
          .from('integrations')
          .select('config')
          .eq('project_id', project.id)
          .eq('type', 'clickup')
          .eq('enabled', true)
          .maybeSingle();

        const token = (cuIntegration?.config as Record<string, string>)?.accessToken;
        if (token) {
          const { data: usersResp } = await service.auth.admin.listUsers();
          const commenter = usersResp?.users.find((u) => u.id === user.id);
          const commenterName = commenter?.user_metadata?.full_name ?? commenter?.user_metadata?.name ?? commenter?.email ?? 'Someone';
          const commentText = `ScaleFeedback · ${commenterName} commented:\n${body.trim()}`;

          await fetch(`https://api.clickup.com/api/v2/task/${feedback.external_id}/comment`, {
            method: 'POST',
            headers: { Authorization: token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment_text: commentText, notify_all: false }),
          });
        }
      } catch { /* never block on ClickUp sync failures */ }
    })();
  }

  // Notifications + emails (fire-and-forget, non-blocking)
  void (async () => {
    try {
      const feedbackTitle = feedback.title ?? feedback.page_url ?? 'Feedback';
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project.id}/${feedback_id}`;

      const { data: usersResp } = await service.auth.admin.listUsers();
      const commenter = usersResp?.users.find((u) => u.id === user.id);
      const commenterName = commenter?.user_metadata?.full_name ?? commenter?.user_metadata?.name ?? commenter?.email ?? 'Someone';
      const notifBody = `${commenterName}: ${body.trim().slice(0, 100)}`;

      if (!is_internal) {
        // In-app: all org members except commenter
        await notifyOrgMembers(service, project.organisation_id, user.id, {
          type: 'comment',
          title: `New comment on "${feedbackTitle}"`,
          body: notifBody,
          feedbackId: feedback_id,
          projectId: project.id,
        });

        // In-app: project guests except commenter
        await notifyProjectGuests(service, project.id, user.id, {
          type: 'comment',
          title: `New comment on "${feedbackTitle}"`,
          body: notifBody,
          feedbackId: feedback_id,
          projectId: project.id,
        });

        // Email: assignee (if different from commenter)
        if (feedback.assigned_to && feedback.assigned_to !== user.id) {
          const assignee = usersResp?.users.find((u) => u.id === feedback.assigned_to);
          if (assignee?.email) {
            void sendGuestCommentEmail({
              to: assignee.email,
              projectName: project.name,
              feedbackTitle,
              guestEmail: commenter?.email ?? '',
              guestName: commenterName,
              commentBody: body.trim(),
              dashboardUrl,
            });
          }
        }

        // Email: reporter
        if (feedback.reporter_email) {
          void sendGuestCommentEmail({
            to: feedback.reporter_email,
            projectName: project.name,
            feedbackTitle,
            guestEmail: commenter?.email ?? '',
            guestName: commenterName,
            commentBody: body.trim(),
            dashboardUrl,
          });
        }

        // Email: accepted project guests (excluding reporter to avoid duplicate)
        const { data: projectGuests } = await service
          .from('project_guests')
          .select('email')
          .eq('project_id', project.id)
          .not('accepted_at', 'is', null);

        const guestEmails = (projectGuests ?? [])
          .map((g: { email: string }) => g.email)
          .filter((email: string) =>
            email !== user.email &&
            email !== feedback.reporter_email
          );

        for (const guestEmail of guestEmails) {
          void sendGuestCommentEmail({
            to: guestEmail,
            projectName: project.name,
            feedbackTitle,
            guestEmail: commenter?.email ?? '',
            guestName: commenterName,
            commentBody: body.trim(),
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/guest/${project.id}/${feedback_id}`,
          });
        }
      }
    } catch { /* never block on notification failures */ }
  })();

  return NextResponse.json({ data: comment }, { status: 201 });
}
