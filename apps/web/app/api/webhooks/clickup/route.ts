import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createHmac } from 'crypto';
import { mapClickUpStatus } from '@/lib/integrations/clickup';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const webhookId = payload.webhook_id as string;
  const event = payload.event as string;
  const taskId = payload.task_id as string;

  if (!webhookId || !event || !taskId) {
    return NextResponse.json({ ok: true }); // ignore malformed pings
  }

  // Verify HMAC signature — ClickUp signs with the webhook ID as the secret
  const signature = req.headers.get('x-signature');
  if (signature) {
    const expected = createHmac('sha256', webhookId).update(rawBody).digest('hex');
    if (signature !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  const service = createServiceClient();

  // Find the integration that owns this webhook
  const { data: integrationRows } = await service
    .from('integrations')
    .select('project_id, config')
    .eq('type', 'clickup')
    .filter('config->>webhookId', 'eq', webhookId);

  if (!integrationRows?.length) {
    return NextResponse.json({ ok: true }); // no matching integration, ignore
  }

  const { project_id: projectId, config } = integrationRows[0] as {
    project_id: string;
    config: Record<string, string>;
  };

  // Find the feedback linked to this ClickUp task
  const { data: feedbackRows } = await service
    .from('feedback')
    .select('id, status')
    .eq('project_id', projectId)
    .eq('external_id', taskId);

  const feedback = feedbackRows?.[0] as { id: string; status: string } | undefined;
  if (!feedback) {
    return NextResponse.json({ ok: true }); // task not tracked by us
  }

  const historyItems = (payload.history_items as unknown[]) ?? [];

  /* ── Handle taskStatusUpdated ── */
  if (event === 'taskStatusUpdated') {
    for (const item of historyItems) {
      const hi = item as { after?: { status: string; type: string } };
      if (!hi.after) continue;

      const newStatus = mapClickUpStatus(hi.after.status, hi.after.type);
      if (newStatus && newStatus !== feedback.status) {
        await service
          .from('feedback')
          .update({ status: newStatus })
          .eq('id', feedback.id);

        // Log the status change in the activity log
        await service.from('activity_log').insert({
          feedback_id: feedback.id,
          user_id: null,
          action: 'status_changed',
          details: {
            from: feedback.status,
            to: newStatus,
            source: 'clickup',
            clickup_status: hi.after.status,
          },
        });
      }
    }
  }

  /* ── Handle taskCommentPosted ── */
  if (event === 'taskCommentPosted') {
    for (const item of historyItems) {
      const hi = item as {
        comment?: {
          comment_text?: string;
          comment?: Array<{ text: string }>;
          user?: { username: string };
        };
      };
      if (!hi.comment) continue;

      // Extract comment text from either format ClickUp may send
      const commentText =
        hi.comment.comment_text ??
        hi.comment.comment?.map((c) => c.text).join('') ??
        '';

      const authorName = hi.comment.user?.username ?? 'ClickUp';

      if (!commentText.trim()) continue;
      // Skip comments that we posted from ScaleFeedback to avoid duplicates
      if (commentText.includes('ScaleFeedback ·') || commentText.includes('(via ScaleFeedback)')) continue;

      // Fetch full comment text from ClickUp API if we only got a partial payload
      const body = commentText
        ? `[via ClickUp · ${authorName}]\n${commentText}`
        : null;

      if (body) {
        await service.from('comments').insert({
          feedback_id: feedback.id,
          user_id: null, // external comment — no internal user
          body,
          is_internal: false,
        });

        // Notify via activity log
        await service.from('activity_log').insert({
          feedback_id: feedback.id,
          user_id: null,
          action: 'comment_added',
          details: { source: 'clickup', author: authorName },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
