import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '',
      email: user.email ?? '',
    },
  });
}
