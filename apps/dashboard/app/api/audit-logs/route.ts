import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const service = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  // Resolve the caller's org (same logic as other endpoints)
  const { data: memberRows } = await service
    .from('members')
    .select('organisation_id, role')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .order('accepted_at', { ascending: false });
  const membership = memberRows?.find((m) => m.role !== 'owner') ?? memberRows?.[0] ?? null;

  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only owners and admins can view audit logs' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10));
  const limit = 50;
  const offset = page * limit;

  const { data: logs, error, count } = await service
    .from('org_audit_log')
    .select('*', { count: 'exact' })
    .eq('organisation_id', membership.organisation_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve actor emails from auth users
  const actorIds = [...new Set((logs ?? []).map((l) => l.actor_id).filter(Boolean))];
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

  const enriched = (logs ?? []).map((l) => ({
    ...l,
    actor: l.actor_id ? (actorMap[l.actor_id] ?? null) : null,
  }));

  return NextResponse.json({ logs: enriched, total: count ?? 0, page, limit });
}
