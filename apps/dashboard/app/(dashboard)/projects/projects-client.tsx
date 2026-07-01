'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormattedDate } from '@/components/formatted-date';
import { createClient } from '@/lib/supabase/client';
import type { Project } from '@scalefeedback/shared';
import { CreateProjectDialog } from './create-project-dialog';
import { useToast } from '@/components/ui/toast';

type ViewMode = 'grid' | 'list';
type TabFilter = 'active' | 'archived';

function ProjectAvatar({ project }: { project: Project }) {
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0"
      style={{ backgroundColor: project.widget_config?.color ?? '#ff724f' }}
    >
      {project.name.charAt(0).toUpperCase()}
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
        isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {isActive ? 'Active' : 'Archived'}
    </span>
  );
}

function GridCard({ project, onRestore }: { project: Project; onRestore: (id: string) => void }) {
  return (
    <div className="relative group">
      <Link
        href={`/projects/${project.id}`}
        className={`block bg-white border rounded-2xl p-5 hover:shadow-card-hover transition-all ${
          project.is_active
            ? 'border-gray-100 hover:border-[#ff724f]/20'
            : 'border-gray-100 opacity-70 hover:opacity-100'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <ProjectAvatar project={project} />
          <StatusBadge isActive={project.is_active} />
        </div>

        <h3 className="font-semibold text-[#111111] text-sm group-hover:text-[#ff724f] transition-colors font-heading">
          {project.name}
        </h3>
        {project.domain && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{project.domain}</p>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <code className="text-[11px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg truncate flex-1">
            {project.api_key}
          </code>
          <FormattedDate date={project.created_at} className="text-[11px] text-gray-400 shrink-0" />
        </div>
      </Link>

      {/* Restore button shown on archived cards */}
      {!project.is_active && (
        <button
          onClick={() => onRestore(project.id)}
          className="absolute bottom-4 right-4 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
        >
          <span className="material-symbols-outlined text-[13px]">unarchive</span>
          Restore
        </button>
      )}
    </div>
  );
}

function ListRow({ project, onRestore }: { project: Project; onRestore: (id: string) => void }) {
  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors border-b border-gray-50 last:border-0 ${!project.is_active ? 'opacity-70 hover:opacity-100' : ''}`}>
      <Link
        href={`/projects/${project.id}`}
        className="flex items-center gap-4 flex-1 min-w-0 group"
      >
        <ProjectAvatar project={project} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#111111] group-hover:text-[#ff724f] transition-colors truncate font-heading">
            {project.name}
          </p>
          {project.domain && (
            <p className="text-xs text-gray-400 truncate">{project.domain}</p>
          )}
        </div>

        <code className="hidden md:block text-[11px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg truncate max-w-[180px]">
          {project.api_key}
        </code>

        <StatusBadge isActive={project.is_active} />

        <FormattedDate date={project.created_at} className="text-xs text-gray-400 shrink-0 hidden sm:block" />

        <span className="material-symbols-outlined text-gray-300 group-hover:text-[#ff724f] text-[18px] transition-colors shrink-0">
          chevron_right
        </span>
      </Link>

      {/* Restore button for archived rows */}
      {!project.is_active && (
        <button
          onClick={() => onRestore(project.id)}
          className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[13px]">unarchive</span>
          Restore
        </button>
      )}
    </div>
  );
}

export function ProjectsClient({ projects }: { projects: Project[] }) {
  const toast = useToast();
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<TabFilter>('active');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('grid');

  const activeCount = projects.filter((p) => p.is_active).length;
  const archivedCount = projects.filter((p) => !p.is_active).length;

  const filtered = projects.filter((p) => {
    const matchTab = tab === 'active' ? p.is_active : !p.is_active;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.domain ?? '').toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const handleRestore = useCallback(async (projectId: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ is_active: true })
      .eq('id', projectId);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Project restored successfully.');
      router.refresh();
    }
  }, [supabase, router, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#111111] font-heading">Projects</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Each project maps to one website with the widget installed.
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm mb-5 flex items-center px-4 gap-0 overflow-hidden">
        {/* Active / Archived underline tabs */}
        <div className="flex items-center shrink-0">
          {([
            { value: 'active' as TabFilter,   label: 'Active',   count: activeCount },
            { value: 'archived' as TabFilter, label: 'Archived', count: archivedCount },
          ] as const).map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors ${
                tab === value
                  ? 'text-[#111111]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {label}
              <span
                className={`text-[11px] font-bold min-w-[20px] text-center px-1.5 py-0.5 rounded-full transition-colors ${
                  tab === value
                    ? value === 'active'
                      ? 'bg-[#fff3f0] text-[#ff724f]'
                      : 'bg-gray-100 text-gray-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {count}
              </span>
              {/* Active underline indicator */}
              {tab === value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff724f] rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-100 mx-2 shrink-0" />

        {/* Search */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full bg-transparent pl-9 pr-4 py-3.5 text-sm placeholder:text-gray-400 focus:outline-none text-gray-700"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-100 mx-2 shrink-0" />

        {/* Grid / List toggle */}
        <div className="flex items-center gap-0.5 shrink-0 py-2">
          {([
            { value: 'grid' as ViewMode, icon: 'grid_view',  title: 'Grid view' },
            { value: 'list' as ViewMode, icon: 'view_agenda', title: 'List view' },
          ] as const).map(({ value, icon, title }) => (
            <button
              key={value}
              onClick={() => setView(value)}
              title={title}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                view === value
                  ? 'bg-[#fff3f0] text-[#ff724f]'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center bg-white">
          <div className="w-14 h-14 bg-[#fff3f0] rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#ff724f] text-[28px]">
              {search ? 'search_off' : tab === 'archived' ? 'inventory_2' : 'folder_open'}
            </span>
          </div>
          <h3 className="font-semibold text-[#111111] text-base mb-1.5 font-heading">
            {search
              ? 'No projects match your search'
              : tab === 'archived'
              ? 'No archived projects'
              : 'No projects yet'}
          </h3>
          <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
            {search
              ? 'Try a different name or clear the search.'
              : tab === 'archived'
              ? 'Projects you archive from their settings will appear here.'
              : 'Create your first project to get a widget snippet and start collecting feedback.'}
          </p>
          {!search && tab === 'active' && <CreateProjectDialog />}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((project) => (
            <GridCard key={project.id} project={project} onRestore={handleRestore} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-card">
          {filtered.map((project) => (
            <ListRow key={project.id} project={project} onRestore={handleRestore} />
          ))}
        </div>
      )}
    </div>
  );
}
