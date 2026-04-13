import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { name, domain } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Project name is required' }, { status: 400 });

  const service = createServiceClient();

  const { data: members } = await service
    .from('members')
    .select('organisation_id, role')
    .eq('user_id', user.id)
    .order('accepted_at', { ascending: false })
    .limit(10);

  const member = members?.[0] ?? null;
  if (!member) return NextResponse.json({ error: 'No organisation found' }, { status: 403 });

  const allowed = ['owner', 'admin', 'member'];
  if (!allowed.includes(member.role)) {
    return NextResponse.json({ error: 'You do not have permission to create projects' }, { status: 403 });
  }

  const { data: project, error: insertError } = await service
    .from('projects')
    .insert({
      name: name.trim(),
      domain: domain?.trim() || null,
      organisation_id: member.organisation_id,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ project }, { status: 201 });
}
