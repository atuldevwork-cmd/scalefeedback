import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Params { params: Promise<{ projectId: string }> }

// GET — return the current guest invite URL
export async function GET(_req: Request, { params }: Params) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('guest_secret')
    .eq('id', projectId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return NextResponse.json({ url: `${appUrl}/guest/join?s=${data.guest_secret}` });
}

// POST — regenerate the guest secret (invalidates old link)
export async function POST(_req: Request, { params }: Params) {
  const { projectId } = await params;
  const supabase = await createClient();
  const newSecret = crypto.randomUUID();

  const { error } = await supabase
    .from('projects')
    .update({ guest_secret: newSecret })
    .eq('id', projectId);

  if (error) {
    return NextResponse.json({ error: 'Failed to regenerate link' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return NextResponse.json({ url: `${appUrl}/guest/join?s=${newSecret}` });
}
