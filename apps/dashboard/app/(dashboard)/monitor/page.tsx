import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/mock-data';
import { marketingUrl } from '@/lib/marketing-url';

export const dynamic = 'force-dynamic';

interface ProjectRow {
  id: string;
  name: string;
  domain: string | null;
}

interface MonitorRow {
  id: string;
  project_id: string;
  target_url: string;
  last_scanned_at: string | null;
}

export default async function MonitorIndexPage() {
  let plan: 'free' | 'pro' | 'agency' = 'free';
  let projects: ProjectRow[] = [];
  let monitors: MonitorRow[] = [];
  let openCounts: Record<string, number> = {};

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const service = createServiceClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: members } = await service
          .from('members')
          .select('organisation_id, role, accepted_at')
          .eq('user_id', user.id)
          .not('accepted_at', 'is', null)
          .order('accepted_at', { ascending: false })
          .limit(10);

        const member = members?.find((m) => m.role !== 'owner') ?? members?.[0];

        if (member) {
          const [orgResult, projectsResult] = await Promise.all([
            service.from('organisations').select('plan').eq('id', member.organisation_id).single(),
            service.from('projects').select('id, name, domain').eq('organisation_id', member.organisation_id).order('created_at', { ascending: false }),
          ]);
          if (orgResult.data?.plan) plan = orgResult.data.plan as 'free' | 'pro' | 'agency';
          projects = (projectsResult.data ?? []) as ProjectRow[];

          if (projects.length > 0) {
            const projectIds = projects.map((p) => p.id);
            const { data: monitorRows } = await service
              .from('project_monitors')
              .select('id, project_id, target_url, last_scanned_at')
              .in('project_id', projectIds);
            monitors = (monitorRows ?? []) as MonitorRow[];

            if (monitors.length > 0) {
              const monitorIds = monitors.map((m) => m.id);
              const { data: issueRows } = await service
                .from('monitor_issues')
                .select('monitor_id')
                .in('monitor_id', monitorIds)
                .eq('status', 'open');
              openCounts = (issueRows ?? []).reduce((acc: Record<string, number>, row: { monitor_id: string }) => {
                acc[row.monitor_id] = (acc[row.monitor_id] ?? 0) + 1;
                return acc;
              }, {});
            }
          }
        }
      }
    } catch { /* fall through */ }
  }

  const monitorByProject = new Map(monitors.map((m) => [m.project_id, m]));

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-bold text-[#111111] font-heading">Website Monitoring</h1>
        <span className="text-[10px] font-bold bg-[#fff3f0] text-[#ff724f] px-1.5 py-0.5 rounded-full tracking-wide">NEW</span>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        On-demand accessibility, broken link, SEO &amp; AI-search, and legal/privacy scans across your projects.
        Set up monitoring inside any project to get started.
      </p>

      {plan !== 'agency' ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-lg">
          <span className="material-symbols-outlined text-[#ff724f] text-[32px] mb-3">radar</span>
          <h2 className="text-lg font-bold text-[#111111] mb-2">Website Monitoring is an Agency feature</h2>
          <p className="text-sm text-gray-500 mb-5">
            Automatically scan your sites for accessibility, broken links, SEO &amp; AI-search, and legal/privacy issues
            — missing alt text, dead links, missing meta tags, missing privacy policy, and more — without waiting for
            a reporter to find them.
          </p>
          <a
            href={marketingUrl('/pricing')}
            className="inline-flex items-center gap-1.5 bg-[#ff724f] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#e8603a] transition-colors"
          >
            Upgrade to Agency
          </a>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-sm text-gray-500 max-w-lg">
          No projects yet. Create a project first, then set up monitoring from inside it.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const monitor = monitorByProject.get(project.id);
            const openCount = monitor ? (openCounts[monitor.id] ?? 0) : 0;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}/monitor`}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-[#ff724f]/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-[#111111] truncate">{project.name}</p>
                  <span className="material-symbols-outlined text-[18px] text-gray-300">chevron_right</span>
                </div>
                {project.domain && (
                  <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">language</span>
                    {project.domain}
                  </p>
                )}
                {monitor ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {openCount > 0 ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        {openCount} open issue{openCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        No open issues
                      </span>
                    )}
                    {monitor.last_scanned_at && (
                      <span className="text-[11px] text-gray-400">
                        Scanned {new Date(monitor.last_scanned_at).toLocaleDateString('en-US')}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    Not configured
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
