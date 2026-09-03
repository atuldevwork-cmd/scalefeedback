import { NextRequest, NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';
import { createServiceClient } from '@/lib/supabase/server';
import { sendNewFeedbackEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';
import { planAtLeast } from '@/lib/plan';
import { translateFeedbackText, generateFeedbackTitle } from '@/lib/ai-text';
import type { SubmitFeedbackPayload, AiSettings } from '@pinmarks/shared';

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

    // Decompress gzip-compressed session events sent by the widget.
    // The widget uses CompressionStream('gzip') + base64 to stay under Vercel's
    // 4.5MB body limit (a 4MB HubSpot snapshot compresses to ~400KB).
    let sessionEvents: unknown[] | null = (body as { session_events_gz?: string; session_events?: unknown[] }).session_events_gz
      ? (() => {
          try {
            const gz = (body as { session_events_gz: string }).session_events_gz;
            const buf = Buffer.from(gz, 'base64');
            const decompressed = gunzipSync(buf);
            return JSON.parse(decompressed.toString('utf-8')) as unknown[];
          } catch {
            return null;
          }
        })()
      : (body.session_events ?? null);

    // Org plan is needed for both the session-replay gate below and the AI features —
    // fetch it once and reuse rather than querying multiple times.
    let orgPlan: string | null | undefined;
    let aiSettings: Partial<AiSettings> | undefined;
    if (sessionEvents || body.title || body.description) {
      const { data: org } = await supabase
        .from('organisations')
        .select('plan, ai_settings')
        .eq('id', project.organisation_id)
        .single();
      orgPlan = org?.plan;
      aiSettings = org?.ai_settings ?? undefined;
    }

    // Defense in depth: session_events is only a Pro/Agency feature. The widget
    // already gets `sessionReplay: false` from /api/widget-config on lower plans
    // and won't record, but a stale cached config or a direct API call
    // shouldn't be able to smuggle a recording in anyway.
    if (sessionEvents && !planAtLeast(orgPlan, 'pro')) {
      sessionEvents = null;
    }

    const customMetadata = { ...(body.custom_metadata ?? {}) } as Record<string, unknown>;
    let translatedTitle = body.title;
    let translatedDescription = body.description;

    // AI Translation (Pro+, admin-configurable at /settings/ai): detect reports not
    // already in the team's language and translate for the dashboard, keeping the
    // original text around so the team can still see what was actually written.
    if (planAtLeast(orgPlan, 'pro') && (aiSettings?.translate_enabled ?? true) && (body.title || body.description)) {
      try {
        const translation = await translateFeedbackText(
          { title: body.title, description: body.description },
          aiSettings?.team_language || 'English'
        );
        if (translation) {
          translatedTitle = translation.title;
          translatedDescription = translation.description;
          customMetadata.translation = {
            detectedLanguage: translation.detectedLanguage,
            originalTitle: body.title ?? null,
            originalDescription: body.description ?? null,
          };
        }
      } catch { /* translation must never block submission */ }
    }

    // AI Title Generation (Pro+, admin-configurable at /settings/ai): when enabled the
    // widget hides the title field for reporters, so generate one from the description.
    if (
      planAtLeast(orgPlan, 'pro') &&
      aiSettings?.title_generation_enabled &&
      !translatedTitle?.trim() &&
      translatedDescription?.trim()
    ) {
      try {
        translatedTitle = await generateFeedbackTitle(translatedDescription);
      } catch { /* title generation must never block submission */ }
    }

    // Assignee — re-validate against real org membership rather than trusting
    // the client-submitted user_id verbatim (the widget only offers ids from
    // assignableMembers, but a raw API call could send anything).
    let assignedTo: string | null = null;
    if (body.assigned_to && project.organisation_id) {
      const { data: memberRow } = await supabase
        .from('members')
        .select('user_id')
        .eq('organisation_id', project.organisation_id)
        .eq('user_id', body.assigned_to)
        .not('accepted_at', 'is', null)
        .maybeSingle();
      if (memberRow) assignedTo = memberRow.user_id;
    }

    const baseInsert = {
      project_id: project.id,
      reporter_name: body.reporter_name || null,
      reporter_email: body.reporter_email || null,
      title: translatedTitle || null,
      description: translatedDescription || null,
      type: body.type,
      priority: body.priority || 'medium',
      assigned_to: assignedTo,
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
      custom_metadata: customMetadata,
    };

    // Insert feedback record (with session_events/due_date if provided, fall back
    // without them if either column is missing — e.g. migration 031 not applied yet).
    let { data: feedback, error: insertError } = await supabase
      .from('feedback')
      .insert({ ...baseInsert, session_events: sessionEvents, due_date: body.due_date || null })
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
          reporterEmail: body.reporter_email,
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
          consoleLogs: body.console_logs,
          hasSessionReplay: Boolean(sessionEvents && sessionEvents.length),
          customMetadata: body.custom_metadata,
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
