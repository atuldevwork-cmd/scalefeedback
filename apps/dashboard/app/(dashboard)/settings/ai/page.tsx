import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/mock-data';
import { AiSettingsForm } from './ai-settings-form';

export default async function AiSettingsPage() {
  let canManage = true;
  let plan: 'free' | 'pro' | 'agency' = 'free';

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const service = createServiceClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: memberRows } = await service
          .from('members')
          .select('role, organisation_id')
          .eq('user_id', user.id)
          .not('accepted_at', 'is', null)
          .order('accepted_at', { ascending: false })
          .limit(10);
        const preferred = memberRows?.find((m) => m.role !== 'owner') ?? memberRows?.[0];
        const role = preferred?.role ?? 'member';
        canManage = role === 'owner' || role === 'admin';

        if (preferred?.organisation_id) {
          const { data: org } = await service
            .from('organisations')
            .select('plan')
            .eq('id', preferred.organisation_id)
            .single();
          if (org?.plan) plan = org.plan as 'free' | 'pro' | 'agency';
        }
      }
    } catch { /* fall through */ }
  }

  return <AiSettingsForm canManage={canManage} plan={plan} />;
}
