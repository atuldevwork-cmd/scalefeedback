import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The handle_new_user() DB trigger creates a personal "owner" workspace for
 * every signup, and only skips that for pending *team* invitations — not
 * guest invites. So a brand-new guest ends up owning an empty workspace in
 * the background. Delete it once we know the account is a guest: only when
 * this user is the sole member of that org AND it has zero projects, so we
 * never touch a real workspace.
 */
export async function cleanupEmptyOwnerOrgs(service: SupabaseClient, userId: string) {
  const { data: memberships } = await service
    .from('members')
    .select('organisation_id')
    .eq('user_id', userId)
    .eq('role', 'owner');

  for (const m of memberships ?? []) {
    const [{ count: memberCount }, { count: projectCount }] = await Promise.all([
      service.from('members').select('id', { count: 'exact', head: true }).eq('organisation_id', m.organisation_id),
      service.from('projects').select('id', { count: 'exact', head: true }).eq('organisation_id', m.organisation_id),
    ]);
    if (memberCount === 1 && projectCount === 0) {
      await service.from('members').delete().eq('organisation_id', m.organisation_id).eq('user_id', userId);
      await service.from('organisations').delete().eq('id', m.organisation_id);
    }
  }
}
