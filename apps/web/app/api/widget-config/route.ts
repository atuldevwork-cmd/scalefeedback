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

  let project: { widget_config: unknown } | null = null;
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('projects')
      .select('widget_config')
      .eq('api_key', key)
      .single();
    project = data;
  } catch {
    // If Supabase is unavailable, return safe defaults so widget still loads
  }

  if (!project) {
    // Return defaults instead of 404 — widget should always load
    return NextResponse.json(
      { color: '#7C3AED', position: 'bottom-right', buttonText: 'Report issue',
        guestReporting: true, collectConsole: true, collectNetwork: false,
        audience: 'everyone', pages: 'all' },
      { headers: CORS }
    );
  }

  const cfg = (project.widget_config ?? {}) as Record<string, unknown>;

  // If the request includes a valid Supabase auth token, return the logged-in user's
  // name and email so the widget can hide the name/email fields automatically.
  let loggedInUser: { name: string; email: string } | undefined;
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const supabase = createServiceClient();
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        loggedInUser = {
          name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? '',
          email: user.email ?? '',
        };
      }
    } catch { /* ignore auth errors — just don't pre-fill */ }
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
      ...(loggedInUser ? { user: loggedInUser } : {}),
    },
    { headers: CORS }
  );
}
