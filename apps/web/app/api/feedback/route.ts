import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendNewFeedbackEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';
import type { SubmitFeedbackPayload } from '@scalefeedback/shared';

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 20 per minute per IP
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
    const rl = rateLimit(`feedback:${ip}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, {
        status: 429,
        headers: { 'Retry-After': '60', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const body: SubmitFeedbackPayload = await request.json();
    const supabase = await createServiceClient();

    // Validate the API key and get the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, is_active, widget_config, organisation_id')
      .eq('api_key', body.project_api_key)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    if (!project.is_active) {
      return NextResponse.json({ error: 'Project is inactive' }, { status: 403 });
    }

    // Upload screenshot if provided
    let screenshotPath: string | null = null;
    if (body.screenshot) {
      // Convert base64 data URL to buffer
      const base64Data = body.screenshot.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `${project.id}/${Date.now()}.png`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (!uploadError && uploadData) {
        screenshotPath = uploadData.path;
      }
    }

    const screenshotPublicUrl = screenshotPath
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/screenshots/${screenshotPath}`
      : undefined;

    const baseInsert = {
      project_id: project.id,
      reporter_name: body.reporter_name || null,
      reporter_email: body.reporter_email || null,
      title: body.title || null,
      description: body.description || null,
      type: body.type,
      screenshot_url: screenshotPath,
      page_url: body.page_url,
      browser: body.browser,
      os: body.os,
      screen_size: body.screen_size,
      viewport_size: body.viewport_size,
      device_pixel_ratio: body.device_pixel_ratio,
      user_agent: body.user_agent,
      console_logs: body.console_logs ?? [],
      network_logs: body.network_logs ?? [],
      custom_metadata: body.custom_metadata ?? {},
    };

    // Insert feedback record (with session_events if provided, fall back without if column missing)
    let { data: feedback, error: insertError } = await supabase
      .from('feedback')
      .insert({ ...baseInsert, session_events: body.session_events ?? null })
      .select()
      .single();

    // PGRST204 = column not found in schema cache (e.g. local DB without migration)
    if (insertError && (insertError as { code?: string }).code === 'PGRST204') {
      ({ data: feedback, error: insertError } = await supabase
        .from('feedback')
        .insert(baseInsert)
        .select()
        .single());
    }

    if (insertError) {
      console.error('Feedback insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    // Send email notification (fire-and-forget)
    try {
      const { data: members } = await supabase
        .from('members')
        .select('user_id, notification_preferences')
        .eq('organisation_id', project.organisation_id ?? '');

      // Get emails for org members who have new_feedback notifications enabled
      if (members?.length) {
        const { data: users } = await supabase.auth.admin.listUsers();
        const memberMap = new Map(
          (members as { user_id: string; notification_preferences?: Record<string, boolean> }[])
            .map((m) => [m.user_id, m.notification_preferences])
        );
        const emails = users?.users
          .filter((u) => {
            if (!u.email || !memberMap.has(u.id)) return false;
            const prefs = memberMap.get(u.id);
            return prefs == null || prefs.new_feedback !== false;
          })
          .map((u) => u.email as string) ?? [];

        for (const email of emails) {
          void sendNewFeedbackEmail({
            to: email,
            projectName: project.name ?? 'your project',
            feedbackTitle: feedback?.title ?? body.description ?? 'New feedback',
            feedbackType: body.type,
            reporterName: body.reporter_name,
            pageUrl: body.page_url,
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project.id}/${feedback?.id}`,
          });
        }
      }
    } catch { /* email errors must never break the response */ }

    // Fire integrations (fire-and-forget)
    try {
      const { data: integrations } = await supabase
        .from('integrations')
        .select('*')
        .eq('project_id', project.id)
        .eq('enabled', true);

      if (integrations?.length) {
        const { fireIntegrations } = await import('@/lib/integrations');
        void fireIntegrations(integrations, {
          feedbackId: feedback.id,
          projectId: project.id,
          projectName: project.name ?? 'Project',
          feedbackTitle: feedback.title ?? body.description ?? 'New feedback',
          feedbackType: body.type,
          description: body.description,
          reporterName: body.reporter_name,
          pageUrl: body.page_url,
          status: 'open',
          priority: body.priority,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project.id}/${feedback.id}`,
          screenshotUrl: screenshotPublicUrl,
          browser: body.browser,
          os: body.os,
          screenSize: body.screen_size,
          viewportSize: body.viewport_size,
          devicePixelRatio: body.device_pixel_ratio,
        }, supabase);
      }
    } catch { /* integrations must never break submission */ }

    return NextResponse.json(
      { data: feedback },
      {
        status: 201,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
