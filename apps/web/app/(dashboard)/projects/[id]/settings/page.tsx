import Link from 'next/link';
import { Suspense } from 'react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, MOCK_PROJECTS } from '@/lib/mock-data';
import { WidgetInstallSnippet } from './widget-install-snippet';
import { ProjectSettingsForm } from './project-settings-form';
import { DeleteProjectButton } from './delete-project-button';
import { ArchiveProjectButton } from './archive-project-button';
import { IntegrationsPanel } from './integrations-panel';
import { GuestsPanel } from './guests-panel';
import { ButtonPanel } from './button-panel';
import { SessionReplayPanel } from './session-replay-panel';
import { SettingsNav } from './settings-nav';
import type { Project } from '@scalefeedback/shared';

interface Props {
  params: Promise<{ id: string }>;
}

const CodeIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);
const ButtonIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
  </svg>
);
const ReplayIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const DetailsIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IntegrationsIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);
const GuestIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const DangerIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export default async function ProjectSettingsPage({ params }: Props) {
  const { id } = await params;

  let project: Project | null = null;
  let canManage = true;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const service = createServiceClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('projects').select('*').eq('id', id).single();
      project = data as Project | null;

      if (user) {
        const { data: memberRows } = await service
          .from('members')
          .select('role')
          .eq('user_id', user.id)
          .not('accepted_at', 'is', null)
          .order('accepted_at', { ascending: false })
          .limit(10);
        const preferred = memberRows?.find((m) => m.role !== 'owner') ?? memberRows?.[0];
        const role = preferred?.role ?? 'member';
        canManage = role === 'owner' || role === 'admin';
      }
    } catch {
      // fall through to mock
    }
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

  const navItems = [
    { id: 'widget-installation', label: 'Widget Installation', icon: CodeIcon },
    { id: 'button', label: 'Button', icon: ButtonIcon },
    { id: 'session-replay', label: 'Session Replay', icon: ReplayIcon },
    { id: 'project-details', label: 'Project Details', icon: DetailsIcon },
    ...(canManage ? [
      { id: 'integrations', label: 'Integrations', icon: IntegrationsIcon },
      { id: 'guest-access', label: 'Guest Access', icon: GuestIcon },
      { id: 'danger-zone', label: 'Danger Zone', icon: DangerIcon },
    ] : []),
  ];

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-foreground">{project.name}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Settings</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-8">Project Settings</h1>

      <div className="flex gap-8 items-start">

        {/* Sticky sidebar nav */}
        <div className="w-52 shrink-0 hidden md:block">
          <div className="sticky top-6">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Sections</p>
            <SettingsNav items={navItems} />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-w-0 space-y-8">

          <div id="widget-installation" className="bg-card border border-border rounded-xl p-6 scroll-mt-6">
            <h2 className="font-semibold text-foreground mb-1">Widget Installation</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Paste this snippet before the closing <code className="bg-muted px-1 py-0.5 rounded text-xs">&lt;/body&gt;</code> tag on your website.
            </p>
            <WidgetInstallSnippet apiKey={project.api_key} projectName={project.name} />
          </div>

          <div id="button" className="bg-card border border-border rounded-xl p-6 scroll-mt-6">
            <h2 className="font-semibold text-foreground mb-1">Button</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Customize the feedback button appearance and targeting behavior.
            </p>
            <ButtonPanel project={project} />
          </div>

          <div id="session-replay" className="bg-card border border-border rounded-xl p-6 scroll-mt-6">
            <h2 className="font-semibold text-foreground mb-1">Session Replay</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Record user sessions so you can watch exactly what happened before a bug report was submitted.
            </p>
            <SessionReplayPanel project={project} />
          </div>

          <div id="project-details" className="bg-card border border-border rounded-xl p-6 scroll-mt-6">
            <h2 className="font-semibold text-foreground mb-4">Project Details</h2>
            <ProjectSettingsForm project={project} />
          </div>

          {canManage && (
            <div id="integrations" className="bg-card border border-border rounded-xl p-6 scroll-mt-6">
              <h2 className="font-semibold text-foreground mb-1">Integrations</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Connect feedback to your existing tools. Triggers on each new feedback submission.
              </p>
              <Suspense>
                <IntegrationsPanel projectId={project.id} />
              </Suspense>
            </div>
          )}

          {canManage && (
            <div id="guest-access" className="bg-card border border-border rounded-xl p-6 scroll-mt-6">
              <h2 className="font-semibold text-foreground mb-1">Guest Access</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Share read-only access with clients so they can view feedback without a workspace account.
              </p>
              <GuestsPanel projectId={project.id} />
            </div>
          )}

          {canManage && (
            <div id="danger-zone" className="bg-card border border-red-200 rounded-xl p-6 scroll-mt-6">
              <h2 className="font-semibold text-red-700 mb-1">Danger Zone</h2>

              <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {project.is_active ? 'Archive project' : 'Restore project'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {project.is_active
                      ? 'Hide this project and pause feedback collection. All data is kept and it can be restored anytime.'
                      : 'Reactivate this project so it appears in the active list and accepts feedback again.'}
                  </p>
                </div>
                <div className="shrink-0">
                  <ArchiveProjectButton
                    projectId={project.id}
                    projectName={project.name}
                    isActive={project.is_active}
                  />
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 pt-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">Delete project</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Permanently delete this project and all its feedback. This cannot be undone.
                  </p>
                </div>
                <div className="shrink-0">
                  <DeleteProjectButton projectId={project.id} projectName={project.name} />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
