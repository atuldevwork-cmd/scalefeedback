import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { cleanupEmptyOwnerOrgs } from '@/lib/guest-cleanup';

interface Body {
  mode: 'secret' | 'token';
  secret?: string;
  token?: string;
  email?: string;
  password: string;
  name?: string;
}

// Single entry point for the guest invite forms (secret link + email invite).
// One form field set, no separate sign-in/sign-up choice: we try to create the
// account; if it already exists we fall back to signing in with the given
// password. New accounts are created pre-confirmed — guest access is
// read-only and scoped to one project, so the usual "check your inbox" step
// would just be friction for no real safety gain.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const { mode, password, name } = body;

  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const service = createServiceClient();

  let projectId: string;
  let projectGuestId: string | null = null;
  let email: string;

  if (mode === 'secret') {
    if (!body.secret || !body.email) {
      return NextResponse.json({ error: 'Missing secret or email' }, { status: 400 });
    }
    const { data: rows } = await service.rpc('get_project_by_guest_secret', { p_secret: body.secret });
    const project = (rows as { id: string; name: string }[] | null)?.[0] ?? null;
    if (!project) return NextResponse.json({ error: 'This invite link is invalid or has been revoked.' }, { status: 404 });
    projectId = project.id;
    email = body.email;
  } else if (mode === 'token') {
    if (!body.token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    const { data: guest } = await service
      .from('project_guests')
      .select('id, project_id, email, expires_at')
      .eq('token', body.token)
      .single();
    if (!guest) return NextResponse.json({ error: 'This guest invite link is invalid or has already been used.' }, { status: 404 });
    if (new Date(guest.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite link has expired. Ask the project owner to resend it.' }, { status: 410 });
    }
    projectId = guest.project_id;
    projectGuestId = guest.id;
    email = guest.email;
  } else {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { full_name: name } : undefined,
  });

  if (createErr) {
    const alreadyExists = createErr.message.toLowerCase().includes('already been registered')
      || createErr.message.toLowerCase().includes('already registered')
      || createErr.status === 422;
    if (!alreadyExists) {
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      return NextResponse.json(
        { error: 'An account with this email already exists and this password doesn\'t match. Try again or reset your password.' },
        { status: 401 }
      );
    }
  } else if (created.user) {
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      return NextResponse.json({ error: signInErr.message }, { status: 500 });
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Could not establish a session' }, { status: 500 });

  if (mode === 'secret') {
    const { data: existing } = await service
      .from('project_guests')
      .select('id, accepted_at')
      .eq('project_id', projectId)
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      if (!existing.accepted_at) {
        await service.from('project_guests').update({ accepted_at: new Date().toISOString() }).eq('id', existing.id);
      }
    } else {
      const expires = new Date();
      expires.setDate(expires.getDate() + 90);
      await service.from('project_guests').insert({
        project_id: projectId,
        email,
        name: name ?? null,
        token: crypto.randomUUID(),
        accepted_at: new Date().toISOString(),
        expires_at: expires.toISOString(),
      });
    }
  } else if (projectGuestId) {
    await service.from('project_guests').update({ accepted_at: new Date().toISOString() }).eq('id', projectGuestId);
  }

  await cleanupEmptyOwnerOrgs(service, user.id);

  return NextResponse.json({ redirect: `/guest/${projectId}` });
}
