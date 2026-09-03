import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, MOCK_PROJECTS } from '@/lib/mock-data';
import { marketingUrl } from '@/lib/marketing-url';
import { AiVisibilityClient } from './ai-visibility-client';
import type { Project } from '@pinmarks/shared';

interface Props {
  params: Promise<{ id: string }>;
}

// AI Visibility is brand-level (does ChatGPT/Claude/Perplexity/Gemini
// mention or cite us for these prompts), not page-level like the rest of
// Monitor's category tabs — it gets its own route rather than another
// category tab, since prompts/competitors/runs are a completely different
// data shape from monitor_issues.
export default async function AiVisibilityPage({ params }: Props) {
  const { id } = await params;

  let project: Pick<Project, 'id' | 'name' | 'domain'> | null = null;
  let canManage = false;
  let plan: 'free' | 'pro' | 'agency' = 'free';
  let hasMonitor = false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const service = createServiceClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: proj } = await service.from('projects').select('id, name, domain, organisation_id').eq('id', id).single();

      if (proj && user) {
        const { data: membership } = await service
          .from('members')
          .select('role')
          .eq('user_id', user.id)
          .eq('organisation_id', proj.organisation_id)
          .not('accepted_at', 'is', null)
          .single();

        if (membership) {
          project = proj;
          canManage = membership.role === 'owner' || membership.role === 'admin';

          const [orgResult, monitorResult] = await Promise.all([
            service.from('organisations').select('plan').eq('id', proj.organisation_id).single(),
            service.from('project_monitors').select('id').eq('project_id', id).maybeSingle(),
          ]);

          if (orgResult.data?.plan) plan = orgResult.data.plan as 'free' | 'pro' | 'agency';
          hasMonitor = !!monitorResult.data;
        }
      }
    } catch { /* fall through to mock */ }
  }

  if (!project) {
    project = MOCK_PROJECTS.find((p) => p.id === id) ?? null;
  }

  if (!project) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Project not found.{' '}
        <Link href="/projects" className="text-[#ff724f] underline">Back to projects</Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href="/projects" className="hover:text-[#ff724f] transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">folder_open</span>
          Projects
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link href={`/projects/${id}`} className="hover:text-[#ff724f] transition-colors">{project.name}</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link href={`/projects/${id}/monitor`} className="hover:text-[#ff724f] transition-colors">Monitor</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#111111] font-medium">AI Visibility</span>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-xl font-bold text-[#111111] font-heading">AI Visibility</h1>
        <span className="text-[10px] font-bold bg-[#fff3f0] text-[#ff724f] px-1.5 py-0.5 rounded-full tracking-wide">NEW</span>
      </div>

      {plan !== 'agency' ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-lg mx-auto">
          <span className="material-symbols-outlined text-[#ff724f] text-[32px] mb-3">travel_explore</span>
          <h2 className="text-lg font-bold text-[#111111] mb-2">AI Visibility is an Agency feature</h2>
          <p className="text-sm text-gray-500 mb-5">
            Test real prompts against ChatGPT, Claude, Perplexity, and Gemini to see whether — and how — your brand gets
            mentioned and cited, plus how you compare to named competitors.
          </p>
          <a
            href={marketingUrl('/pricing')}
            className="inline-flex items-center gap-1.5 bg-[#ff724f] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#e8603a] transition-colors"
          >
            Upgrade to Agency
          </a>
        </div>
      ) : !hasMonitor ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-lg mx-auto">
          <span className="material-symbols-outlined text-[#ff724f] text-[32px] mb-3">radar</span>
          <h2 className="text-lg font-bold text-[#111111] mb-2">Set up Website Monitoring first</h2>
          <p className="text-sm text-gray-500 mb-5">
            AI Visibility uses your monitor's target URL as the brand's domain — set up monitoring for this project before
            configuring AI Visibility prompts.
          </p>
          <Link
            href={`/projects/${id}/monitor`}
            className="inline-flex items-center gap-1.5 bg-[#ff724f] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#e8603a] transition-colors"
          >
            Go to Monitor
          </Link>
        </div>
      ) : (
        <AiVisibilityClient projectId={id} canManage={canManage} brandName={project.name} />
      )}
    </div>
  );
}
