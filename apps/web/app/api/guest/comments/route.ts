import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { notifyOrgMembers, notifyProjectGuests } from '@/lib/notifications';
import { sendGuestCommentEmail } from '@/lib/email';

// POST /api/guest/comments
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { feedback_id, body } = await req.json();
  if (!feedback_id || !body?.trim()) {
    return NextResponse.json({ error: 'feedback_id and body are required' }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: feedback } = await service
    .from('feedback')
    .select('id, title, page_url, project_id, assigned_to, reporter_email, projects(id, name, organisation_id)')
    .eq('id', feedback_id)
    .single();

  if (!feedback) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });

  const projectRaw = feedback.projects;
  const project = (Array.isArray(projectRaw) ? projectRaw[0] : projectRaw) as { id: string; name: string; organisation_id: string } | null;
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Verify caller is a guest or org member
  const [{ data: guestRows }, { data: memberRows }] = await Promise.all([
    service
      .from('project_guests')
      .select('id, name')
      .eq('project_id', project.id)
      .eq('email', user.email ?? '')
      .not('accepted_at', 'is', null)
      .limit(1),
    service
      .from('members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organisation_id', project.organisation_id)
      .limit(1),
  ]);
  const guestAccess = guestRows?.[0] ?? null;
  const membership = memberRows?.[0] ?? null;

  if (!guestAccess && !membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const { data: comment, error } = await service
    .from('comments')
    .insert({ feedback_id, user_id: user.id, body: body.trim(), is_internal: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notifications + emails (fire-and-forget)
  void (async () => {
    try {
      const feedbackTitle = feedback.title ?? feedback.page_url ?? 'Feedback';
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project.id}/${feedback_id}`;
      const guestUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guest/${project.id}/${feedback_id}`;

      const commenterName = guestAccess?.name ?? user.email ?? 'Someone';
      const notifBody = `${commenterName}: ${body.trim().slice(0, 100)}`;

      const { data: usersResp } = await service.auth.admin.listUsers();

      // In-app: notify all org members
      await notifyOrgMembers(service, project.organisation_id, user.id, {
        type: 'comment',
        title: `New comment on "${feedbackTitle}"`,
        body: notifBody,
        feedbackId: feedback_id,
        projectId: project.id,
      });

      // In-app: notify other guests
      await notifyProjectGuests(service, project.id, user.id, {
        type: 'comment',
        title: `New comment on "${feedbackTitle}"`,
        body: notifBody,
        feedbackId: feedback_id,
        projectId: project.id,
      });

      // Email: assignee
      if (feedback.assigned_to && feedback.assigned_to !== user.id) {
        const assignee = usersResp?.users.find((u) => u.id === feedback.assigned_to);
        if (assignee?.email) {
          void sendGuestCommentEmail({
            to: assignee.email,
            projectName: project.name,
            feedbackTitle,
            guestEmail: user.email ?? '',
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
          guestEmail: user.email ?? '',
          guestName: commenterName,
          commentBody: body.trim(),
          dashboardUrl: guestUrl,
        });
      }

      // Email: org owners/admins (only when a guest comments, not a member)
      if (guestAccess && !membership) {
        const { data: adminMembers } = await service
          .from('members')
          .select('user_id')
          .eq('organisation_id', project.organisation_id)
          .in('role', ['owner', 'admin']);

        const adminIds = new Set((adminMembers ?? []).map((m: { user_id: string }) => m.user_id));
        const adminEmails = (usersResp?.users ?? [])
          .filter((u) => adminIds.has(u.id) && u.email && u.id !== feedback.assigned_to)
          .map((u) => u.email as string);

        for (const email of adminEmails) {
          void sendGuestCommentEmail({
            to: email,
            projectName: project.name,
            feedbackTitle,
            guestEmail: user.email ?? '',
            guestName: commenterName,
            commentBody: body.trim(),
            dashboardUrl,
          });
        }
      }
    } catch { /* never block on notification failures */ }
  })();

  return NextResponse.json({ data: comment }, { status: 201 });
}
