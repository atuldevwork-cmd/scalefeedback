import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, MOCK_PROJECTS } from '@/lib/mock-data';
import { CreateProjectDialog } from './create-project-dialog';
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-[#300a46] font-heading">Projects</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Each project maps to one website with the widget installed.
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {!projects.length ? (
        /* Empty state */
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center bg-white">
          <div className="w-14 h-14 bg-[#fff3f0] rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#ff724f] text-[28px]">folder_open</span>
          </div>
          <h3 className="font-semibold text-[#300a46] text-base mb-1.5 font-heading">No projects yet</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
            Create your first project to get a widget snippet and start collecting feedback.
          </p>
          <CreateProjectDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-card-hover hover:border-[#ff724f]/20 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                  style={{ backgroundColor: project.widget_config?.color ?? '#ff724f' }}
                >
                  {project.name.charAt(0).toUpperCase()}
                </div>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    project.is_active
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {project.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h3 className="font-semibold text-[#300a46] text-sm group-hover:text-[#ff724f] transition-colors font-heading">
                {project.name}
              </h3>
              {project.domain && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{project.domain}</p>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                <code className="text-[11px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg truncate flex-1">
                  {project.api_key}
                </code>
                <span className="text-[11px] text-gray-400 shrink-0">{formatDate(project.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
