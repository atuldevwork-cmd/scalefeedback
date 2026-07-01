import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, MOCK_PROJECTS } from '@/lib/mock-data';
import { ProjectsClient } from './projects-client';
import type { Project } from '@scalefeedback/shared';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ org?: string; joined?: string }>;
}

export default async function ProjectsPage({ searchParams }: Props) {
  const { org: orgParam } = await searchParams;
  let projects: Project[] = [];
  let redirectTo: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Use service client to bypass RLS for the member lookup
        const service = createServiceClient();

        // If ?org= param is set (e.g. just joined via invite), prefer that org
        let member: { organisation_id: string } | null = null;
        if (orgParam) {
          const { data: rows } = await service
            .from('members')
            .select('organisation_id')
            .eq('user_id', user.id)
            .eq('organisation_id', orgParam)
            .not('accepted_at', 'is', null)
            .limit(1);
          member = rows?.[0] ?? null;
        }
        if (!member) {
          // Order by accepted_at DESC so an invited user sees the workspace they joined,
          // not the auto-created personal workspace (which has an earlier accepted_at).
          const { data: members } = await service
            .from('members')
            .select('organisation_id, role, accepted_at')
            .eq('user_id', user.id)
            .not('accepted_at', 'is', null)
            .order('accepted_at', { ascending: false })
            .limit(10);

          if (members && members.length > 0) {
            // Prefer an org where the user is NOT the sole owner (i.e. they were invited)
            const invited = members.find((m) => m.role !== 'owner');
            member = invited ?? members[0];
          }
        }

        if (member) {
          const { data } = await service
            .from('projects')
            .select('*')
            .eq('organisation_id', member.organisation_id)
            .order('created_at', { ascending: false });
          projects = (data ?? []) as Project[];
        } else {
          // No workspace membership — check if user is a project guest
          const { data: guestRows } = await service
            .from('project_guests')
            .select('project_id')
            .eq('email', user.email ?? '')
            .not('accepted_at', 'is', null)
            .limit(1);
          const guestAccess = guestRows?.[0] ?? null;
          redirectTo = guestAccess ? `/guest/${guestAccess.project_id}` : '/no-access';
        }
      }
    } catch {
      projects = MOCK_PROJECTS;
    }
  } else {
    projects = MOCK_PROJECTS;
  }

  // redirect() must be called outside try/catch — it throws internally
  if (redirectTo) redirect(redirectTo);

  return <ProjectsClient projects={projects} />;
}
