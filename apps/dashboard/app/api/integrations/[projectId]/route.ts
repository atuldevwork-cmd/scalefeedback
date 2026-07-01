import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/mock-data';

interface Props { params: Promise<{ projectId: string }> }

/** Verify the authenticated user is a member of the org that owns the project. */
async function authorise(userId: string, projectId: string) {
  const service = createServiceClient();
  const { data: project } = await service
    .from('projects')
    .select('organisation_id')
    .eq('id', projectId)
    .single();
  if (!project) return null;

  const { data: membership } = await service
    .from('members')
    .select('role')
    .eq('user_id', userId)
    .eq('organisation_id', project.organisation_id)
    .not('accepted_at', 'is', null)
    .single();

  return membership ?? null;
}

export async function GET(_req: NextRequest, { params }: Props) {
  const { projectId } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ data: [] });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const membership = await authorise(user.id, projectId);
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const service = createServiceClient();
  const { data } = await service.from('integrations').select('*').eq('project_id', projectId);
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest, { params }: Props) {
  const { projectId } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ data: null });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const membership = await authorise(user.id, projectId);
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only owners and admins can manage integrations' }, { status: 403 });
  }

  const body = await req.json();
  const service = createServiceClient();
  const { data, error } = await service
    .from('integrations')
    .upsert({ ...body, project_id: projectId }, { onConflict: 'project_id,type' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const { projectId } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  if (!isSupabaseConfigured() || !type) return NextResponse.json({ ok: true });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const membership = await authorise(user.id, projectId);
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only owners and admins can manage integrations' }, { status: 403 });
  }

  const service = createServiceClient();
  await service.from('integrations').delete().eq('project_id', projectId).eq('type', type);
  return NextResponse.json({ ok: true });
}
