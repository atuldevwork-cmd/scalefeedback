import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, MOCK_PROJECTS } from '@/lib/mock-data';
import { marketingUrl } from '@/lib/marketing-url';
import { MonitorClient } from './monitor-client';
import type { Project } from '@pinmarks/shared';

interface Props {
  params: Promise<{ id: string }>;
}

export interface MonitorIssuePage {
  page_url: string;
  screenshot_path: string | null;
  node_html: string;
  node_target: string;
}

export interface MonitorIssue {
  id: string;
  rule_id: string;
  title: string;
  description: string;
  help_url: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'resolved' | 'dismissed';
  category: 'accessibility' | 'broken_links' | 'seo' | 'legal' | 'content_quality' | 'brand_consistency' | 'custom';
  pages: MonitorIssuePage[];
  first_seen_at: string;
  last_seen_at: string;
}

export interface MonitorConfig {
  id: string;
  target_url: string;
  wcag_level: 'A' | 'AA' | 'AAA';
  max_pages: number;
  last_scanned_at: string | null;
  interested_check: string | null;
  custom_check_prompt: string | null;
}

export interface AccessibilityScoreEntry {
  score: number;
  failed_checks: number;
  pages_scanned: number;
  scanned_at: string;
}

export default async function ProjectMonitorPage({ params }: Props) {
  const { id } = await params;

  let project: Pick<Project, 'id' | 'name' | 'domain'> | null = null;
  let canManage = false;
  let plan: 'free' | 'pro' | 'agency' = 'free';
  let monitor: MonitorConfig | null = null;
  let issues: MonitorIssue[] = [];
  let accessibilityScores: AccessibilityScoreEntry[] = [];

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
            service.from('project_monitors').select('*').eq('project_id', id).maybeSingle(),
          ]);

          if (orgResult.data?.plan) plan = orgResult.data.plan as 'free' | 'pro' | 'agency';
          monitor = monitorResult.data as MonitorConfig | null;

          if (monitor) {
            const [issuesResult, scoresResult] = await Promise.all([
              service
                .from('monitor_issues')
                .select('id, rule_id, title, description, help_url, priority, status, category, pages, first_seen_at, last_seen_at')
                .eq('monitor_id', monitor.id)
                .order('last_seen_at', { ascending: false }),
              service
                .from('monitor_accessibility_scores')
                .select('score, failed_checks, pages_scanned, scanned_at')
                .eq('monitor_id', monitor.id)
                .order('scanned_at', { ascending: false })
                .limit(20),
            ]);

            // Priority is a text column (critical/high/medium/low) — alphabetical
            // DB ordering doesn't reflect severity, so rank it here instead.
            const PRIORITY_RANK: Record<MonitorIssue['priority'], number> = { critical: 3, high: 2, medium: 1, low: 0 };
            issues = ((issuesResult.data ?? []) as MonitorIssue[])
              .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
            accessibilityScores = (scoresResult.data ?? []) as AccessibilityScoreEntry[];
          }
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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href="/projects" className="hover:text-[#ff724f] transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">folder_open</span>
          Projects
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link href={`/projects/${id}`} className="hover:text-[#ff724f] transition-colors">{project.name}</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#111111] font-medium">Monitor</span>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <h1 className="text-xl font-bold text-[#111111] font-heading">Website Monitoring</h1>
        <span className="text-[10px] font-bold bg-[#fff3f0] text-[#ff724f] px-1.5 py-0.5 rounded-full tracking-wide">NEW</span>
        {monitor && (
          <Link
            href={`/projects/${id}/monitor/ai-visibility`}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">travel_explore</span>
            AI Visibility
          </Link>
        )}
      </div>

      {plan !== 'agency' ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-lg mx-auto">
          <span className="material-symbols-outlined text-[#ff724f] text-[32px] mb-3">radar</span>
          <h2 className="text-lg font-bold text-[#111111] mb-2">Website Monitoring is an Agency feature</h2>
          <p className="text-sm text-gray-500 mb-5">
            Automatically scan your site for accessibility, broken links, SEO &amp; AI-search, and legal/privacy issues
            — missing alt text, poor color contrast, dead links, missing meta tags, missing privacy policy, and more —
            without waiting for a reporter to find them.
          </p>
          <a
            href={marketingUrl('/pricing')}
            className="inline-flex items-center gap-1.5 bg-[#ff724f] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#e8603a] transition-colors"
          >
            Upgrade to Agency
          </a>
        </div>
      ) : (
        <MonitorClient projectId={id} canManage={canManage} monitor={monitor} issues={issues} accessibilityScores={accessibilityScores} />
      )}
    </div>
  );
}
