import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/mock-data';
import { AuditLogsClient } from './audit-logs-client';

export interface AuditLogEntry {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  actor: { email: string; name: string } | null;
}

const MOCK_LOGS: AuditLogEntry[] = [
  {
    id: '1',
    action: 'project.created',
    target_type: 'project',
    target_id: 'proj_demo_abc123',
    details: { name: 'My Client Site', domain: 'client-site.com' },
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    actor: { name: 'Atul Singh', email: 'atul@scalestation.io' },
  },
  {
    id: '2',
    action: 'member.invited',
    target_type: 'invitation',
    target_id: 'aditya@scalestation.io',
    details: { email: 'aditya@scalestation.io', role: 'admin' },
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    actor: { name: 'Atul Singh', email: 'atul@scalestation.io' },
  },
  {
    id: '3',
    action: 'member.role_changed',
    target_type: 'member',
    target_id: 'mem_xyz',
    details: { previous_role: 'member', new_role: 'admin' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    actor: { name: 'Atul Singh', email: 'atul@scalestation.io' },
  },
  {
    id: '4',
    action: 'project.created',
    target_type: 'project',
    target_id: 'proj_demo_xyz789',
    details: { name: 'E-Commerce Store', domain: 'mystore.io' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    actor: { name: 'Aditya Singh', email: 'aditya@scalestation.io' },
  },
  {
    id: '5',
    action: 'member.removed',
    target_type: 'member',
    target_id: 'mem_abc',
    details: { removed_email: 'ex-member@example.com', removed_role: 'member' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    actor: { name: 'Atul Singh', email: 'atul@scalestation.io' },
  },
];

export default async function AuditLogsPage() {
  if (!isSupabaseConfigured()) {
    return <AuditLogsClient logs={MOCK_LOGS} total={MOCK_LOGS.length} />;
  }

  const supabase = await createClient();
  const service = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Resolve org and role
  const { data: memberRows } = await service
    .from('members')
    .select('organisation_id, role')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .order('accepted_at', { ascending: false });
  const membership = memberRows?.find((m) => m.role !== 'owner') ?? memberRows?.[0] ?? null;

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="text-xl font-bold text-[#300a46] mb-1">Audit Logs</h1>
        <div className="mt-6 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          Only workspace owners and admins can view audit logs.
        </div>
      </div>
    );
  }

  const { data: logsRaw, count } = await service
    .from('org_audit_log')
    .select('*', { count: 'exact' })
    .eq('organisation_id', membership.organisation_id)
    .order('created_at', { ascending: false })
    .limit(200);

  // Enrich with actor info
  const actorIds = [...new Set((logsRaw ?? []).map((l) => l.actor_id).filter(Boolean))];
  let actorMap: Record<string, { email: string; name: string }> = {};
  if (actorIds.length > 0) {
    const { data: usersData } = await service.auth.admin.listUsers();
    actorMap = Object.fromEntries(
      (usersData?.users ?? [])
        .filter((u) => actorIds.includes(u.id))
        .map((u) => [
          u.id,
          {
            email: u.email ?? '',
            name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split('@')[0] ?? '',
          },
        ])
    );
  }

  const logs: AuditLogEntry[] = (logsRaw ?? []).map((l) => ({
    id: l.id,
    action: l.action,
    target_type: l.target_type,
    target_id: l.target_id,
    details: l.details ?? {},
    created_at: l.created_at,
    actor: l.actor_id ? (actorMap[l.actor_id] ?? null) : null,
  }));

  return <AuditLogsClient logs={logs} total={count ?? 0} />;
}
