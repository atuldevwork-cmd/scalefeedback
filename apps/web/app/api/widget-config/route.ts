import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

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

  let project: { id: string; widget_config: unknown } | null = null;
  try {
    const { data } = await supabase
      .from('projects')
      .select('id, widget_config')
      .eq('api_key', key)
      .single();
    project = data;
  } catch {
    // If Supabase is unavailable, return safe defaults so widget still loads
  }

  if (!project) {
    return NextResponse.json(
      { color: '#7C3AED', position: 'bottom-right', buttonText: 'Report issue',
        guestReporting: true, collectConsole: true, collectNetwork: false,
        audience: 'everyone', pages: 'all', sessionReplay: false },
      { headers: CORS }
    );
  }

  const cfg = (project.widget_config ?? {}) as Record<string, unknown>;

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
      position:        cfg.buttonPlacement ?? cfg.position ?? 'bottom-right',
      buttonText:      cfg.buttonText      ?? 'Report issue',
      guestReporting:  cfg.guestReporting  ?? true,
      collectConsole:  cfg.collectConsole  ?? true,
      collectNetwork:  cfg.collectNetwork  ?? false,
      audience:        cfg.audience        ?? 'everyone',
      pages:           cfg.pages           ?? 'all',
      secretParamType: cfg.secretParamType ?? 'default',
      secretParam:     cfg.secretParam     ?? '',
      sessionReplay:   cfg.sessionReplay   ?? false,
      ...(loggedInUser ? { user: loggedInUser } : {}),
    },
    { headers: CORS }
  );
}
