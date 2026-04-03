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
    .select('id, title, page_url, project_id, assigned_to, reporter_email, external_id, projects(id, name, organisation_id)')
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
          const commenterName = guestAccess?.name ?? user.email ?? 'Someone';
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

  // Notifications + emails (fire-and-forget)
  void (async () => {
    try {
      const feedbackTitle = feedback.title ?? feedback.page_url ?? 'Feedback';
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project.id}/${feedback_id}`;
      const guestUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guest/${project.id}/${feedback_id}`;

      const commenterName = guestAccess?.name ?? user.email ?? 'Someone';
      const notifBody = `${commenterName}: ${body.trim().slice(0, 100)}`;

      const { data: usersResp } = await service.auth.admin.listUsers();

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

// GET /api/guest/comments?feedback_id=X&after=ISO_TIMESTAMP
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const feedbackId = searchParams.get('feedback_id');
  const after = searchParams.get('after');
  if (!feedbackId) return NextResponse.json({ error: 'feedback_id required' }, { status: 400 });

  const service = createServiceClient();

  const { data: feedback } = await service
    .from('feedback')
    .select('id, project_id, external_id, projects(id, organisation_id)')
    .eq('id', feedbackId)
    .single();
  if (!feedback) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const project = (Array.isArray(feedback.projects) ? feedback.projects[0] : feedback.projects) as { id: string; organisation_id: string } | null;
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [{ data: guestRows }, { data: memberRows }] = await Promise.all([
    service.from('project_guests').select('id, name').eq('project_id', project.id).eq('email', user.email ?? '').not('accepted_at', 'is', null).limit(1),
    service.from('members').select('role').eq('user_id', user.id).eq('organisation_id', project.organisation_id).limit(1),
  ]);
  if (!guestRows?.[0] && !memberRows?.[0]) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  // Sync ClickUp comments → DB (fallback for when webhook can't reach localhost)
  if (feedback.external_id) {
    try {
      const { data: integration } = await service
        .from('integrations')
        .select('config')
        .eq('project_id', project.id)
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
            .from('comments').select('body').eq('feedback_id', feedbackId);
          const existingBodies = new Set((existingComments ?? []).map((c: { body: string }) => c.body));

          for (const cc of cuComments ?? []) {
            const text = cc.comment_text ?? '';
            if (!text.trim()) continue;
            if (text.includes('ScaleFeedback ·') || text.includes('(via ScaleFeedback)')) continue;
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
    .select('id, body, created_at, user_id, is_internal')
    .eq('feedback_id', feedbackId)
    .eq('is_internal', false)
    .order('created_at', { ascending: true });

  if (after) query = query.gt('created_at', after);

  const { data: comments } = await query;

  const userIds = [...new Set((comments ?? []).map((c: { user_id: string | null }) => c.user_id).filter(Boolean))] as string[];
  let commenterMap: Record<string, { name: string; email: string }> = {};
  if (userIds.length) {
    const { data: usersResp } = await service.auth.admin.listUsers();
    for (const u of usersResp?.users ?? []) {
      if (userIds.includes(u.id)) {
        commenterMap[u.id] = {
          name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email ?? 'Unknown',
          email: u.email ?? '',
        };
      }
    }
  }

  const CLICKUP_PREFIX = /^\[via ClickUp · (.+?)\]\n/;
  const resolved = (comments ?? []).map((c: { id: string; body: string; created_at: string; user_id: string | null; is_internal: boolean }) => {
    if (!c.user_id) {
      const match = c.body.match(CLICKUP_PREFIX);
      return { ...c, commenterName: match ? match[1] : 'ClickUp', commenterEmail: '' };
    }
    const info = commenterMap[c.user_id];
    return { ...c, commenterName: info?.name ?? 'Unknown', commenterEmail: info?.email ?? '' };
  });

  return NextResponse.json({ data: resolved });
}
