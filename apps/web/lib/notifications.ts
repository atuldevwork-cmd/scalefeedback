import type { SupabaseClient } from '@supabase/supabase-js';

interface NotifyParams {
  type: 'comment' | 'status_change' | 'assigned';
  title: string;
  body?: string;
  feedbackId?: string;
  projectId?: string;
}

export async function notifyOrgMembers(
  service: SupabaseClient,
  organisationId: string,
  excludeUserId: string,
  params: NotifyParams
) {
  const { data: members } = await service
    .from('members')
    .select('user_id')
    .eq('organisation_id', organisationId)
    .not('accepted_at', 'is', null);

  const targets = (members ?? [])
    .map((m: { user_id: string }) => m.user_id)
    .filter((id: string) => id !== excludeUserId);

  if (!targets.length) return;

  await service.from('notifications').insert(
    targets.map((userId: string) => ({
      user_id: userId,
      type: params.type,
      title: params.title,
      body: params.body,
      feedback_id: params.feedbackId,
      project_id: params.projectId,
    }))
  );
}

export async function notifyProjectGuests(
  service: SupabaseClient,
  projectId: string,
  excludeUserId: string,
  params: NotifyParams
) {
  const { data: guests } = await service
    .from('project_guests')
    .select('email')
    .eq('project_id', projectId)
    .not('accepted_at', 'is', null);

  if (!guests?.length) return;

  const guestEmails = guests.map((g: { email: string }) => g.email);
  const { data: usersResp } = await service.auth.admin.listUsers();
  const targets = (usersResp?.users ?? [])
    .filter((u) => u.email && guestEmails.includes(u.email) && u.id !== excludeUserId)
    .map((u) => u.id);

  if (!targets.length) return;

  await service.from('notifications').insert(
    targets.map((userId: string) => ({
      user_id: userId,
      type: params.type,
      title: params.title,
      body: params.body,
      feedback_id: params.feedbackId,
      project_id: projectId,
    }))
  );
}
