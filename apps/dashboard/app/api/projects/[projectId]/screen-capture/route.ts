import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/monitor-auth';

// Basic Auth credentials for server-side screenshot rendering (Project Settings
// > Screen Capture). These live in dedicated `projects` columns — never in
// `widget_config` — because widget_config is returned verbatim (per-key) by the
// public, unauthenticated GET /api/widget-config endpoint. See migration 029.
//
// The other Screen Capture toggles (Native Screenshot API, Authenticated Media
// Capture, and the basicAuthEnabled flag itself) are plain booleans and are
// saved directly to widget_config from the client (same pattern as Session
// Replay) — this route only ever handles the username/password.
//
// NOTE: not yet wired into the actual screenshot/capture pipeline — this route
// only persists the settings.

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.service
    .from('projects')
    .select('basic_auth_username, basic_auth_password')
    .eq('id', projectId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({
    username: data.basic_auth_username ?? '',
    hasPassword: Boolean(data.basic_auth_password),
  });
}

interface PatchBody {
  username?: string;
  password?: string;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins and owners can update Basic Auth credentials.' }, { status: 403 });
  }

  const body: PatchBody = await req.json().catch(() => ({}));

  const update: Record<string, string> = {};
  if (body.username !== undefined) update.basic_auth_username = body.username.trim();
  // An empty password means "leave the existing password unchanged" — this
  // lets the UI omit re-sending a secret it never displays back to the user.
  if (body.password) update.basic_auth_password = body.password;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await auth.service.from('projects').update(update).eq('id', projectId);
  if (error) {
    return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
