import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/monitor-auth';

// Monitor issues live in their own table (see 027_website_monitoring.sql) so a
// scan's automated findings don't flood the feedback backlog. This route is the
// deliberate bridge: when someone actually wants an issue worked on, it copies
// the issue into `feedback` (same shape the AI Scan uses) and marks the source
// monitor issue resolved, since it's now tracked through the normal fix workflow.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service, role } = auth;

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Only admins and owners can send issues to feedback.' }, { status: 403 });
  }

  const body: { ids?: string[] } = await request.json().catch(() => ({}));
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
  }

  const { data: issues, error: fetchError } = await service
    .from('monitor_issues')
    .select('id, rule_id, title, description, help_url, priority, category, pages')
    .eq('project_id', projectId)
    .in('id', body.ids);

  if (fetchError || !issues || issues.length === 0) {
    return NextResponse.json({ error: 'Could not load selected issues' }, { status: 404 });
  }

  const { data: monitor } = await service
    .from('project_monitors')
    .select('target_url')
    .eq('project_id', projectId)
    .single();

  type IssuePage = { page_url: string; screenshot_path: string | null };

  const rows = issues.map((issue) => {
    const pages = (issue.pages ?? []) as IssuePage[];
    return {
      project_id: projectId,
      title: issue.title,
      description: issue.description,
      type: 'bug' as const,
      status: 'open' as const,
      priority: issue.priority,
      page_url: pages[0]?.page_url ?? monitor?.target_url ?? '',
      screenshot_url: pages[0]?.screenshot_path ?? null,
      custom_metadata: {
        source: 'monitor',
        category: issue.category,
        rule_id: issue.rule_id,
        help_url: issue.help_url,
        affected_pages: pages.map((p) => p.page_url),
        monitor_issue_id: issue.id,
      },
    };
  });

  const { error: insertError } = await service.from('feedback').insert(rows);
  if (insertError) {
    console.error('[monitor-issue] Send-to-feedback insert failed:', insertError);
    return NextResponse.json({ error: 'Failed to create feedback items' }, { status: 500 });
  }

  const { error: updateError } = await service
    .from('monitor_issues')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .in('id', body.ids);

  if (updateError) {
    console.error('[monitor-issue] Post-send status update failed:', updateError);
  }

  return NextResponse.json({ ok: true, created: rows.length });
}
