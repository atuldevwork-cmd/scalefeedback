import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GuestNotificationsClient } from './notifications-client';

export default async function GuestNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/guest/notifications');

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  // Mark all as read
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return <GuestNotificationsClient notifications={data ?? []} userEmail={user.email ?? undefined} />;
}
