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
    { id: 'widget-installation', label: 'Widget Installation' },
    { id: 'button', label: 'Button' },
    { id: 'session-replay', label: 'Session Replay' },
    { id: 'project-details', label: 'Project Details' },
    ...(canManage ? [
      { id: 'integrations', label: 'Integrations' },
      { id: 'guest-access', label: 'Guest Access' },
      { id: 'danger-zone', label: 'Danger Zone' },
    ] : []),
  ];

  return (
    <div className="p-8 pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-foreground">{project.name}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Settings</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-6">Project Settings</h1>

      {/* Sticky horizontal nav — sticks to top on scroll */}
      <SettingsNav items={navItems} />

      {/* Sections */}
      <div className="space-y-8 mt-6">

        <div id="widget-installation" className="bg-card border border-border rounded-xl p-6 scroll-mt-16">
          <h2 className="font-semibold text-foreground mb-1">Widget Installation</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Paste this snippet before the closing <code className="bg-muted px-1 py-0.5 rounded text-xs">&lt;/body&gt;</code> tag on your website.
          </p>
          <WidgetInstallSnippet apiKey={project.api_key} projectName={project.name} />
        </div>

        <div id="button" className="bg-card border border-border rounded-xl p-6 scroll-mt-16">
          <h2 className="font-semibold text-foreground mb-1">Button</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Customize the feedback button appearance and targeting behavior.
          </p>
          <ButtonPanel project={project} />
        </div>

        <div id="session-replay" className="bg-card border border-border rounded-xl p-6 scroll-mt-16">
          <h2 className="font-semibold text-foreground mb-1">Session Replay</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Record user sessions so you can watch exactly what happened before a bug report was submitted.
          </p>
          <SessionReplayPanel project={project} />
        </div>

        <div id="project-details" className="bg-card border border-border rounded-xl p-6 scroll-mt-16">
          <h2 className="font-semibold text-foreground mb-4">Project Details</h2>
          <ProjectSettingsForm project={project} />
        </div>

        {canManage && (
          <div id="integrations" className="bg-card border border-border rounded-xl p-6 scroll-mt-16">
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
          <div id="guest-access" className="bg-card border border-border rounded-xl p-6 scroll-mt-16">
            <h2 className="font-semibold text-foreground mb-1">Guest Access</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Share read-only access with clients so they can view feedback without a workspace account.
            </p>
            <GuestsPanel projectId={project.id} />
          </div>
        )}

        {canManage && (
          <div id="danger-zone" className="bg-card border border-red-200 rounded-xl p-6 scroll-mt-16">
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

        {/* CTA Section */}
        <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #ff5733 0%, #ff724f 50%, #ff9a6c 100%)' }}>
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10 bg-white" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full opacity-10 bg-white" />
          <div className="absolute top-4 right-32 w-16 h-16 rounded-full opacity-10 bg-white" />

          <div className="relative px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-7">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Support team online
                </div>
                <h2 className="text-xl font-bold text-white mb-1.5">Need help getting started?</h2>
                <p className="text-sm text-white/75 max-w-sm leading-relaxed">
                  We&apos;re here to help. Browse docs, watch guides, or chat with our team.
                </p>
              </div>
              <div className="flex flex-row items-center gap-2.5 shrink-0">
                <Link
                  href="/docs"
                  className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all border border-white/25"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Read Docs
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 bg-white text-[#ff5733] text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:bg-white/90 shadow-lg shadow-black/10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Contact Support
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />, title: 'Documentation', desc: 'Step-by-step setup guides' },
                { icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></>, title: 'Video Tutorials', desc: 'Watch how everything works' },
                { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />, title: 'Quick Start', desc: 'Go live in under 5 minutes' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 border border-white/15">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-white/65">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
