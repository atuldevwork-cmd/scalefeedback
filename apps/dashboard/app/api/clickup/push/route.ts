import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createClickUpTask } from '@/lib/integrations/clickup';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { feedbackId } = await request.json() as { feedbackId?: string };
    if (!feedbackId) return NextResponse.json({ error: 'feedbackId is required' }, { status: 400 });

    const service = createServiceClient();

    // Fetch the feedback record
    const { data: feedback } = await service
      .from('feedback')
      .select('id, project_id, title, description, type, page_url, external_id, screenshot_url, custom_metadata')
      .eq('id', feedbackId)
      .single();

    if (!feedback) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });

    if (feedback.external_id) {
      return NextResponse.json({ error: 'Already pushed to ClickUp' }, { status: 409 });
    }

    // Verify the user is an owner or admin of the project's org
    const { data: project } = await service
      .from('projects')
      .select('organisation_id, name')
      .eq('id', feedback.project_id)
      .single();

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const { data: membership } = await service
      .from('members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organisation_id', project.organisation_id)
      .not('accepted_at', 'is', null)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only owners and admins can push to ClickUp' }, { status: 403 });
    }

    // Get ClickUp integration config
    const { data: integration } = await service
      .from('integrations')
      .select('config')
      .eq('project_id', feedback.project_id)
      .eq('type', 'clickup')
      .eq('enabled', true)
      .single();

    const config = integration?.config as Record<string, string> | undefined;
    if (!config?.accessToken || !config?.listId) {
      return NextResponse.json(
        { error: 'ClickUp is not fully configured for this project. Set a List in project settings.' },
        { status: 422 }
      );
    }

    // Build screenshot public URL if available
    const screenshotUrl = feedback.screenshot_url
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/screenshots/${feedback.screenshot_url}`
      : undefined;

    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/projects/${feedback.project_id}/${feedback.id}`;

    const result = await createClickUpTask({
      accessToken: config.accessToken,
      listId: config.listId,
      assigneeId: config.assigneeId,
      feedbackTitle: feedback.title ?? `[${feedback.type}] ${feedback.page_url}`,
      feedbackType: feedback.type,
      description: feedback.description ?? undefined,
      pageUrl: feedback.page_url,
      dashboardUrl,
      screenshotUrl,
    });

    if (!result) {
      return NextResponse.json({ error: 'ClickUp task creation failed. Check your integration config.' }, { status: 502 });
    }

    // Save task reference on the feedback record
    await service
      .from('feedback')
      .update({ external_id: result.taskId, external_url: result.taskUrl })
      .eq('id', feedbackId);

    // Log the activity
    await service.from('activity_log').insert({
      feedback_id: feedbackId,
      user_id: user.id,
      action: 'clickup_pushed',
      details: { taskId: result.taskId, taskUrl: result.taskUrl },
    });

    return NextResponse.json({ taskId: result.taskId, taskUrl: result.taskUrl });
  } catch (err) {
    console.error('ClickUp push error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
