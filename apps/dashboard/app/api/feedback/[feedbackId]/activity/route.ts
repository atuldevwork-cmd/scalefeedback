import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/mock-data';

interface Props { params: Promise<{ feedbackId: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { feedbackId } = await params;
  if (!isSupabaseConfigured()) return NextResponse.json({ data: [] });
  const supabase = await createClient();
  const { data } = await supabase
    .from('activity_log')
    .select('*')
    .eq('feedback_id', feedbackId)
    .order('created_at', { ascending: true });
  return NextResponse.json({ data: data ?? [] });
}
