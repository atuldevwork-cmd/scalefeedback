import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { notifyOrgMembers, notifyProjectGuests } from '@/lib/notifications';
import { sendGuestCommentEmail } from '@/lib/email';

// GET /api/comments?feedback_id=X&after=ISO_TIMESTAMP
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const feedbackId = searchParams.get('feedback_id');
  const after = searchParams.get('after');
  if (!feedbackId) return NextResponse.json({ error: 'feedback_id required' }, { status: 400 });

  const service = createServiceClient();

  // Fetch feedback including external_id for ClickUp sync
  const { data: feedback } = await service
    .from('feedback')
    .select('id, project_id, external_id')
    .eq('id', feedbackId)
    .single();

  // Sync ClickUp comments → DB (fallback for when webhook can't reach the server e.g. localhost)
  if (feedback?.external_id) {
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
        const cuRes = await fetch(
          `https://api.clickup.com/api/v2/task/${feedback.external_id}/comment`,
          { headers: { Authorization: token }, cache: 'no-store' }
        );
        if (cuRes.ok) {
          const { comments: cuComments } = await cuRes.json() as {
            comments: { id: string; comment_text: string; user: { username: string }; date: string }[]
          };

          const { data: existingComments } = await service
            .from('comments')
            .select('body')
            .eq('feedback_id', feedbackId);
          const existingBodies = new Set((existingComments ?? []).map((c: { body: string }) => c.body));

          for (const cc of cuComments ?? []) {
            const text = cc.comment_text ?? '';
            if (!text.trim()) continue;
            if (text.includes('Pinmarks ·') || text.includes('(via Pinmarks)')) continue;
            const body = `[via ClickUp · ${cc.user?.username ?? 'ClickUp'}]\n${text}`;
            if (existingBodies.has(body)) continue;
            await service.from('comments').insert({
              feedback_id: feedbackId,
              user_id: null,
              body,
              is_internal: false,
            });
          }
        }
      }
    } catch { /* sync failure must not block the response */ }
  }

  let query = service
    .from('comments')
    .select('id, body, is_internal, created_at, user_id')
    .eq('feedback_id', feedbackId)
    .order('created_at', { ascending: true });

  if (after) query = query.gt('created_at', after);

  const { data: comments } = await query;

  const userIds = [...new Set((comments ?? []).map((c: { user_id: string | null }) => c.user_id).filter(Boolean))] as string[];
  let userMap: Record<string, { name: string; email: string }> = {};
  if (userIds.length) {
    const { data: usersResp } = await service.auth.admin.listUsers();
    for (const u of usersResp?.users ?? []) {
      if (userIds.includes(u.id)) {
        userMap[u.id] = {
          name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email ?? 'Unknown',
          email: u.email ?? '',
        };
      }
    }
  }

  const resolved = (comments ?? []).map((c: { id: string; body: string; is_internal: boolean; created_at: string; user_id: string | null }) => ({
    ...c,
    userName: c.user_id ? (userMap[c.user_id]?.name ?? 'Unknown') : 'ClickUp',
    userEmail: c.user_id ? (userMap[c.user_id]?.email ?? '') : '',
  }));

  return NextResponse.json({ data: resolved });
}

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
          const commentText = `Pinmarks · ${commenterName} commented:\n${body.trim()}`;

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
        await notifyOrgMembers(service, project.organisation_id, user.id, {
          type: 'comment',
          title: `New comment on "${feedbackTitle}"`,
          body: notifBody,
          feedbackId: feedback_id,
          projectId: project.id,
        });

        await notifyProjectGuests(service, project.id, user.id, {
          type: 'comment',
          title: `New comment on "${feedbackTitle}"`,
          body: notifBody,
          feedbackId: feedback_id,
          projectId: project.id,
        });

        if (feedback.assigned_to && feedback.assigned_to !== user.id) {
          const assignee = usersResp?.users.find((u) => u.id === feedback.assigned_to);
          if (assignee?.email) {
            const { data: assigneeMember } = await service
              .from('members')
              .select('notification_preferences')
              .eq('user_id', feedback.assigned_to)
              .single();
            const prefs = assigneeMember?.notification_preferences as Record<string, boolean> | null;
            if (prefs == null || prefs.comments !== false) {
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
        }

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

        const { data: projectGuests } = await service
          .from('project_guests')
          .select('email')
          .eq('project_id', project.id)
          .not('accepted_at', 'is', null);

        const guestEmails = (projectGuests ?? [])
          .map((g: { email: string }) => g.email)
          .filter((email: string) => email !== user.email && email !== feedback.reporter_email);

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
