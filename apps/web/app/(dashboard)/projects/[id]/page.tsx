import Link from 'next/link';
import { Suspense } from 'react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, MOCK_PROJECTS, MOCK_FEEDBACK } from '@/lib/mock-data';
import { FeedbackFilters } from './feedback-filters';
import { RealtimeRefresh } from './realtime-refresh';
import { FeedbackListClient } from './feedback-list-client';
import { AiScanDialog } from './ai-scan-dialog';
import type { Project, Feedback, FeedbackStatus } from '@scalefeedback/shared';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; q?: string; type?: string; priority?: string; range?: string }>;
}

function applyFilters(list: Feedback[], { status, q, type, priority, range }: { status?: string; q?: string; type?: string; priority?: string; range?: string }) {
  let out = [...list];
  if (status) out = out.filter((f) => f.status === status);
  if (type)   out = out.filter((f) => f.type === type);
  if (priority) out = out.filter((f) => f.priority === priority);
  if (q) {
    const lower = q.toLowerCase();
    out = out.filter((f) => (f.title ?? '').toLowerCase().includes(lower) || (f.description ?? '').toLowerCase().includes(lower));
  }
  if (range) {
    const now = Date.now();
    const cutoff = range === 'today' ? now - 86400000 : range === 'week' ? now - 604800000 : now - 2592000000;
    out = out.filter((f) => new Date(f.created_at).getTime() > cutoff);
  }
  return out;
}

const statusLabels: Record<FeedbackStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  wont_fix: "Won't Fix",
};

export default async function ProjectFeedbackPage({ params, searchParams }: Props) {
  const { id } = await params;
  const filters = await searchParams;
  const { status } = filters;

  let project: Pick<Project, 'id' | 'name' | 'domain'> | null = null;
  let allFeedback: Feedback[] = [];
  let userRole: string | null = null;
  let clickupConnected = false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const service = createServiceClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch project by id first (service client bypasses RLS)
        const { data: proj } = await service.from('projects').select('id, name, domain, organisation_id')
          .eq('id', id).single();

        if (proj) {
          // Verify the user is a member and get their role
          const { data: membership } = await service
            .from('members')
            .select('role')
            .eq('user_id', user.id)
            .eq('organisation_id', proj.organisation_id)
            .not('accepted_at', 'is', null)
            .single();

          if (membership) {
            userRole = membership.role;
            project = proj;
            const [feedbackResult, clickupResult] = await Promise.all([
              service.from('feedback').select(
                'id,project_id,title,description,type,status,priority,reporter_name,reporter_email,page_url,browser,os,screen_size,viewport_size,device_pixel_ratio,screenshot_url,assigned_to,external_id,external_url,custom_metadata,created_at,updated_at'
                // session_events / console_logs / network_logs intentionally omitted — large JSONB only needed in detail view.
                // custom_metadata included — small, needed for AI Scan badge + category in list view.
              ).eq('project_id', id).order('created_at', { ascending: false }),
              service.from('integrations').select('id').eq('project_id', id).eq('type', 'clickup').eq('enabled', true).maybeSingle(),
            ]);
            allFeedback = (feedbackResult.data ?? []) as Feedback[];
            clickupConnected = !!clickupResult.data;
          }
        }
      }
    } catch { /* fall through */ }
  }

  if (!project) {
    const mp = MOCK_PROJECTS.find((p) => p.id === id);
    if (!mp) {
      return (
        <div className="p-8 text-center text-gray-500">
          Project not found.{' '}
          <Link href="/projects" className="text-[#ff724f] underline">Back to projects</Link>
        </div>
      );
    }
    project = mp;
    allFeedback = MOCK_FEEDBACK.filter((f) => f.project_id === id) as Feedback[];
  }

  const feedbackList = applyFilters(allFeedback, filters);
  const statuses: FeedbackStatus[] = ['open', 'in_progress', 'resolved', 'closed', 'wont_fix'];
  const countByStatus = Object.fromEntries(statuses.map((s) => [s, allFeedback.filter((f) => f.status === s).length]));

  return (
    <div className="p-8">
      <RealtimeRefresh projectId={id} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href="/projects" className="hover:text-[#ff724f] transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">folder_open</span>
          Projects
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#300a46] font-medium">{project.name}</span>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#300a46] font-heading">{project.name}</h1>
          {project.domain && (
            <p className="text-gray-400 text-sm mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">language</span>
              {project.domain}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AiScanDialog projectId={id} projectDomain={project.domain ?? undefined} />
          <Link
            href={`/projects/${id}/analytics`}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm font-medium px-3 py-2 rounded-xl hover:bg-gray-50 hover:text-[#300a46] transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">bar_chart</span>
            Analytics
          </Link>
          <Link
            href={`/projects/${id}/settings`}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm font-medium px-3 py-2 rounded-xl hover:bg-gray-50 hover:text-[#300a46] transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">settings</span>
            Widget Settings
          </Link>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Link
          href={`/projects/${id}`}
          className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
            !status
              ? 'bg-[#ff724f] text-white shadow-sm'
              : 'bg-gray-100 text-gray-500 hover:bg-[#fff3f0] hover:text-[#ff724f]'
          }`}
        >
          All ({allFeedback.length})
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/projects/${id}?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
              status === s
                ? 'bg-[#ff724f] text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-[#fff3f0] hover:text-[#ff724f]'
            }`}
          >
            {statusLabels[s]}{countByStatus[s] > 0 ? ` (${countByStatus[s]})` : ''}
          </Link>
        ))}
      </div>

      {/* Search + filters */}
      <Suspense>
        <FeedbackFilters projectId={id} />
      </Suspense>

      {/* Feedback list */}
      <FeedbackListClient
        feedback={feedbackList}
        projectId={id}
        screenshotBaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/screenshots` : undefined}
        userRole={userRole}
        clickupConnected={clickupConnected}
      />
    </div>
  );
}
