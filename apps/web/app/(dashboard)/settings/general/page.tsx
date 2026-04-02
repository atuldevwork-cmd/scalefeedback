import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/mock-data';
import { GeneralSettingsForm } from './general-settings-form';

export default async function GeneralPage() {
  let canManage = true;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const service = createServiceClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: memberRows } = await service
          .from('members')
          .select('role')
          .eq('user_id', user.id)
          .limit(1);
        const role = memberRows?.[0]?.role ?? 'member';
        canManage = role === 'owner' || role === 'admin';
      }
    } catch { /* fall through */ }
  }

  return <GeneralSettingsForm canManage={canManage} />;
}
