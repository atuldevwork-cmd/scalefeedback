import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/mock-data';
import { MembersClient } from './members-client';

const MOCK_MEMBERS = [
  { id: 'm-1', user_id: 'u-1', email: 'atul@scalestation.io', name: 'Atul Singh', role: 'owner' },
  { id: 'm-2', user_id: 'u-2', email: 'aditya@scalestation.io', name: 'Aditya Singh', role: 'admin' },
  { id: 'm-3', user_id: 'u-3', email: 'dev@scalestation.io', name: 'Dev Team', role: 'member' },
];

const MOCK_INVITE_LINK = 'https://pinmarks.app/join/demo-invite-token-abc123';

export interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
}

export default async function MembersPage() {
  // Demo mode — no Supabase
  if (!isSupabaseConfigured()) {
    return (
      <MembersClient
        members={MOCK_MEMBERS}
        inviteLink={MOCK_INVITE_LINK}
        pendingInvitations={[]}
        currentUserRole="owner"
      />
    );
  }

  const supabase = await createClient();
  const service = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Check workspace membership — prefer invited org (non-owner role) over personal org
  const { data: memberRows } = await service
    .from('members')
    .select('organisation_id, role')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .order('accepted_at', { ascending: false })
    .limit(10);

  let membership: { organisation_id: string; role: string } | null = null;
  if (memberRows && memberRows.length > 0) {
    membership = memberRows.find((m) => m.role !== 'owner') ?? memberRows[0];
  }

  if (!membership) {
    // Guest — redirect to their project portal
    const { data: guestRows } = await service
      .from('project_guests')
      .select('project_id')
      .eq('email', user.email ?? '')
      .not('accepted_at', 'is', null)
      .limit(1);
    const guestAccess = guestRows?.[0] ?? null;
    redirect(guestAccess ? `/guest/${guestAccess.project_id}` : '/projects');
  }

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/join/${membership.organisation_id}`;

  // Fetch org members
  const { data: orgMembers } = await service
    .from('members')
    .select('id, user_id, role')
    .eq('organisation_id', membership.organisation_id);

  const { data: usersData } = await service.auth.admin.listUsers();
  const userMap = new Map(
    (usersData?.users ?? []).map((u) => [
      u.id,
      {
        email: u.email ?? '',
        name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? '',
      },
    ])
  );

  const members = (orgMembers ?? []).map((m) => {
    const u = userMap.get(m.user_id);
    return {
      id: m.id,
      user_id: m.user_id,
      email: u?.email ?? '',
      name: u?.name || u?.email?.split('@')[0] || m.user_id.slice(0, 8),
      role: m.role,
    };
  });

  // Fetch pending invitations
  const { data: invites } = await service
    .from('invitations')
    .select('id, email, role, created_at, expires_at')
    .eq('organisation_id', membership.organisation_id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  const pendingInvitations: PendingInvitation[] = (invites ?? []).map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    created_at: inv.created_at,
    expires_at: inv.expires_at,
  }));

  return (
    <MembersClient
      members={members}
      inviteLink={inviteLink}
      pendingInvitations={pendingInvitations}
      currentUserRole={membership.role}
      currentUserId={user.id}
    />
  );
}
