import { createClient, createServiceClient } from './supabase/server';

type AuthResult =
  | { ok: true; service: ReturnType<typeof createServiceClient>; projectId: string; organisationId: string; role: string; plan?: string }
  | { ok: false; error: string; status: number };

// Shared membership check for the Monitor API routes — mirrors the inline checks
// already used by /api/ai-scan (service-role client + manual membership lookup,
// since these tables have no anon/authenticated RLS policies of their own).
export async function requireProjectAccess(projectId: string): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Unauthorized', status: 401 };

  const service = createServiceClient();
  const { data: project } = await service
    .from('projects')
    .select('id, organisation_id')
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: 'Project not found', status: 404 };

  const { data: membership } = await service
    .from('members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organisation_id', project.organisation_id)
    .not('accepted_at', 'is', null)
    .limit(1)
    .maybeSingle();
  if (!membership) return { ok: false, error: 'Forbidden', status: 403 };

  const { data: org } = await service
    .from('organisations')
    .select('plan')
    .eq('id', project.organisation_id)
    .single();

  return {
    ok: true,
    service,
    projectId,
    organisationId: project.organisation_id,
    role: membership.role,
    plan: org?.plan,
  };
}
