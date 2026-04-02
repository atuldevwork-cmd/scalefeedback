import Link from 'next/link';
import { Suspense } from 'react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, MOCK_PROJECTS } from '@/lib/mock-data';
import { WidgetInstallSnippet } from './widget-install-snippet';
import { ProjectSettingsForm } from './project-settings-form';
import { DeleteProjectButton } from './delete-project-button';
import { IntegrationsPanel } from './integrations-panel';
import { GuestsPanel } from './guests-panel';
import type { Project } from '@scalefeedback/shared';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectSettingsPage({ params }: Props) {
  const { id } = await params;

  let project: Project | null = null;
  let canManage = true; // default true for demo mode

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
          .limit(1);
        const role = memberRows?.[0]?.role ?? 'member';
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

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-foreground">{project.name}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Settings</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-8">Project Settings</h1>

      <div className="space-y-8">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-1">Widget Installation</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Paste this snippet before the closing <code className="bg-muted px-1 py-0.5 rounded text-xs">&lt;/body&gt;</code> tag on your website.
          </p>
          <WidgetInstallSnippet apiKey={project.api_key} widgetConfig={project.widget_config} />
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4">Project Details</h2>
          <ProjectSettingsForm project={project} />
        </div>

        {canManage && (
          <div className="bg-card border border-border rounded-xl p-6">
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
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-1">Guest Access</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Share read-only access with clients so they can view feedback without a workspace account.
            </p>
            <GuestsPanel projectId={project.id} />
          </div>
        )}

        {canManage && (
          <div className="bg-card border border-red-200 rounded-xl p-6">
            <h2 className="font-semibold text-red-700 mb-1">Danger Zone</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete this project and all its feedback.
            </p>
            <DeleteProjectButton projectId={project.id} projectName={project.name} />
          </div>
        )}
      </div>
    </div>
  );
}
