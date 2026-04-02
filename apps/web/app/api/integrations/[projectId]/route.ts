import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/mock-data';

interface Props { params: Promise<{ projectId: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { projectId } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ data: [] });
  const supabase = await createClient();
  const { data } = await supabase.from('integrations').select('*').eq('project_id', projectId);
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest, { params }: Props) {
  const { projectId } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ data: null });
  const body = await req.json();
  const supabase = await createClient();
  const { data, error } = await supabase
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
  await supabase.from('integrations').delete().eq('project_id', projectId).eq('type', type);
  return NextResponse.json({ ok: true });
}
