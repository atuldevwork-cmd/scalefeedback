import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { planAtLeast } from '@/lib/plan';

// All 4 issue types the widget's type picker currently supports (see
// packages/widget/src/core/widget.ts) — the default when a project hasn't
// customized Guest Forms / Member Forms in Project Settings.
const ALL_FEEDBACK_TYPES = ['bug', 'suggestion', 'question', 'other'];

// CORS — this endpoint is called from customer websites
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400, headers: CORS });
  }

  const supabase = createServiceClient();

  type OrgRow = { plan: string; ai_settings?: { magic_rewrite_enabled?: boolean; title_generation_enabled?: boolean } };
  let project: { id: string; organisation_id: string | null; widget_config: unknown; organisations: OrgRow | OrgRow[] | null } | null = null;
  try {
    const { data } = await supabase
      .from('projects')
      .select('id, organisation_id, widget_config, organisations(plan, ai_settings)')
      .eq('api_key', key)
      .single();
    project = data;
  } catch {
    // If Supabase is unavailable, return safe defaults so widget still loads
  }

  if (!project) {
    return NextResponse.json(
      { color: '#7C3AED', position: 'middle-right', buttonText: 'Report issue',
        guestReporting: true, collectConsole: true, collectNetwork: false,
        audience: 'everyone', pages: 'all', sessionReplay: false, aiRewrite: false,
        aiTitleGeneration: false, guestFormTypes: ALL_FEEDBACK_TYPES, memberFormTypes: ALL_FEEDBACK_TYPES,
        guestFormFields: [], memberFormFields: [] },
      { headers: CORS }
    );
  }

  const cfg = (project.widget_config ?? {}) as Record<string, unknown>;
  const orgRow = Array.isArray(project.organisations) ? project.organisations[0] : project.organisations;
  const hasProAccess = planAtLeast(orgRow?.plan, 'pro');
  const aiSettings = orgRow?.ai_settings ?? {};

  // One shared field list per form (not per issue type). Array.isArray()
  // rejects the older per-type map shape ({bug: [...], idea: [...], ...}) and
  // falls back to [], same as a project that never opened the Fields UI.
  const guestFormFieldsRaw = Array.isArray(cfg.guestFormFields) ? (cfg.guestFormFields as string[]) : [];
  const memberFormFieldsRaw = Array.isArray(cfg.memberFormFields) ? (cfg.memberFormFields as string[]) : [];
  const needsAssignees = guestFormFieldsRaw.includes('assignee') || memberFormFieldsRaw.includes('assignee');

  // Name only, no email — this endpoint is fetched with a public, unauthenticated
  // project key from any website embedding the widget, so we keep the exposure
  // to the minimum needed to render an assignee picker.
  let assignableMembers: { id: string; name: string }[] | undefined;
  if (needsAssignees && project.organisation_id) {
    const { data: memberRows } = await supabase
      .from('members')
      .select('user_id')
      .eq('organisation_id', project.organisation_id)
      .not('accepted_at', 'is', null);
    const memberIds = (memberRows ?? []).map((m) => m.user_id as string);
    if (memberIds.length > 0) {
      const { data: usersResp } = await supabase.auth.admin.listUsers();
      assignableMembers = (usersResp?.users ?? [])
        .filter((u) => memberIds.includes(u.id))
        .map((u) => ({
          id: u.id,
          name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split('@')[0] ?? u.id.slice(0, 8),
        }));
    }
  }

  // If the request includes a valid Supabase auth token, auto-identify the reporter
  // so the widget hides the name/email fields.
  // This covers: members, owners, admins, and accepted guests — anyone logged in.
  let loggedInUser: { name: string; email: string } | undefined;

  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user?.email) {
        // Prefer name from user_metadata (set on signup / OAuth)
        let name: string =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          '';

        // If no name in metadata, check project_guests table (guests log in via email link)
        if (!name && project.id) {
          const { data: guestRow } = await supabase
            .from('project_guests')
            .select('name')
            .eq('project_id', project.id)
            .eq('email', user.email)
            .not('accepted_at', 'is', null)
            .maybeSingle();

          if (guestRow?.name) name = guestRow.name;
        }

        // Fallback to email prefix if still no name
        if (!name) name = user.email.split('@')[0];

        loggedInUser = { name, email: user.email };
      }
    } catch { /* ignore — just don't pre-fill */ }
  }

  return NextResponse.json(
    {
      color:           cfg.color           ?? '#7C3AED',
      position:        cfg.buttonPlacement ?? cfg.position ?? 'middle-right',
      buttonText:      cfg.buttonText      ?? 'Report issue',
      guestReporting:  cfg.guestReporting  ?? true,
      collectConsole:  cfg.collectConsole  ?? true,
      collectNetwork:  hasProAccess && Boolean(cfg.collectNetwork ?? false),
      audience:        cfg.audience        ?? 'everyone',
      pages:           cfg.pages           ?? 'all',
      secretParamType: cfg.secretParamType ?? 'default',
      secretParam:     cfg.secretParam     ?? '',
      sessionReplay:   hasProAccess && Boolean(cfg.sessionReplay),
      aiRewrite:       hasProAccess && (aiSettings.magic_rewrite_enabled ?? true),
      aiTitleGeneration: hasProAccess && Boolean(aiSettings.title_generation_enabled),
      guestFormTypes:  Array.isArray(cfg.guestFormTypes) && cfg.guestFormTypes.length > 0 ? cfg.guestFormTypes : ALL_FEEDBACK_TYPES,
      memberFormTypes: Array.isArray(cfg.memberFormTypes) && cfg.memberFormTypes.length > 0 ? cfg.memberFormTypes : ALL_FEEDBACK_TYPES,
      // Extra field visibility (Guest Forms / Member Forms > Fields) — the
      // same fields for every issue type. An empty list is left as-is here —
      // the widget itself falls back to ['title'] (see widget.ts DEFAULT_VISIBLE_FIELDS).
      guestFormFields:  guestFormFieldsRaw,
      memberFormFields: memberFormFieldsRaw,
      ...(assignableMembers ? { assignableMembers } : {}),
      ...(loggedInUser ? { user: loggedInUser } : {}),
    },
    { headers: CORS }
  );
}
