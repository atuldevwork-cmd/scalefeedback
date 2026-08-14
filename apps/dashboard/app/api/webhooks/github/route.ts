import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { mapGithubState } from '@/lib/integrations/github';
import { planAtLeast } from '@/lib/plan';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let payload: {
    action?: string;
    issue?: { number: number; state: string; state_reason?: string | null; html_url?: string };
    repository?: { full_name: string };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, issue, repository } = payload;
  if (!action || !issue || !repository?.full_name) {
    return NextResponse.json({ ok: true }); // ignore pings / unrelated events
  }

  const [owner, repo] = repository.full_name.split('/');

  const service = createServiceClient();

  // Find the integration that owns this repo
  const { data: integrationRows } = await service
    .from('integrations')
    .select('project_id, config')
    .eq('type', 'github')
    .filter('config->>owner', 'eq', owner)
    .filter('config->>repo', 'eq', repo);

  if (!integrationRows?.length) {
    return NextResponse.json({ ok: true }); // no matching integration, ignore
  }

  const { project_id: projectId, config } = integrationRows[0] as {
    project_id: string;
    config: Record<string, string>;
  };

  // Verify HMAC signature using the secret generated when the webhook was registered
  const signature = req.headers.get('x-hub-signature-256');
  if (!config.webhookSecret || !signature) {
    return NextResponse.json({ error: 'Not configured for signature verification' }, { status: 401 });
  }
  const expected = `sha256=${createHmac('sha256', config.webhookSecret).update(rawBody).digest('hex')}`;
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Find the feedback linked to this GitHub issue
  const { data: feedbackRows } = await service
    .from('feedback')
    .select('id, status')
    .eq('project_id', projectId)
    .eq('external_id', String(issue.number));

  const feedback = feedbackRows?.[0] as { id: string; status: string } | undefined;
  if (!feedback) {
    return NextResponse.json({ ok: true }); // issue not tracked by us
  }

  // Issue sync (status flowing back from GitHub) is a Pro/Agency feature, matching
  // ClickUp's two-way sync gate — free orgs still get one-way "push to GitHub".
  const { data: proj } = await service.from('projects').select('organisation_id').eq('id', projectId).single();
  const { data: org } = proj
    ? await service.from('organisations').select('plan').eq('id', proj.organisation_id).single()
    : { data: null };
  if (!planAtLeast(org?.plan, 'pro')) {
    return NextResponse.json({ ok: true }); // silently ignore — org isn't on a syncing plan
  }

  if (action === 'closed' || action === 'reopened') {
    const newStatus = mapGithubState(issue.state, issue.state_reason);
    if (newStatus && newStatus !== feedback.status) {
      await service.from('feedback').update({ status: newStatus }).eq('id', feedback.id);

      await service.from('activity_log').insert({
        feedback_id: feedback.id,
        user_id: null,
        action: 'status_changed',
        details: {
          from: feedback.status,
          to: newStatus,
          source: 'github',
          github_state: issue.state,
          github_state_reason: issue.state_reason ?? null,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
