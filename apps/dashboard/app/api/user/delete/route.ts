import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function DELETE() {
  const supabase = await createClient();
  const service = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  // Null out FK references that don't have ON DELETE SET NULL,
  // otherwise Supabase will return "Database error deleting user".
  await service.from('feedback').update({ assigned_to: null }).eq('assigned_to', user.id);
  await service.from('comments').update({ user_id: null }).eq('user_id', user.id);
  await service.from('activity_log').update({ user_id: null }).eq('user_id', user.id);

  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
