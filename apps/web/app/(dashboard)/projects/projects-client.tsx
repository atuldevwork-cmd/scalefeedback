'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import type { Project } from '@scalefeedback/shared';
import { CreateProjectDialog } from './create-project-dialog';

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

function GridCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-card-hover hover:border-[#ff724f]/20 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <ProjectAvatar project={project} />
        <StatusBadge isActive={project.is_active} />
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
  );
}

function ListRow({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors border-b border-gray-50 last:border-0"
    >
      <ProjectAvatar project={project} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#300a46] group-hover:text-[#ff724f] transition-colors truncate font-heading">
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

      <span className="text-xs text-gray-400 shrink-0 hidden sm:block">{formatDate(project.created_at)}</span>

      <span className="material-symbols-outlined text-gray-300 group-hover:text-[#ff724f] text-[18px] transition-colors shrink-0">
        chevron_right
      </span>
    </Link>
  );
}

export function ProjectsClient({ projects }: { projects: Project[] }) {
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#300a46] font-heading">Projects</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Each project maps to one website with the widget installed.
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Active / Archived tabs */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setTab('active')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              tab === 'active'
                ? 'bg-white text-[#300a46] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Active
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === 'active' ? 'bg-[#ff724f] text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {activeCount}
            </span>
          </button>
          <button
            onClick={() => setTab('archived')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              tab === 'archived'
                ? 'bg-white text-[#300a46] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Archived
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === 'archived' ? 'bg-gray-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {archivedCount}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all bg-white"
          />
        </div>

        <div className="flex-1" />

        {/* Grid / List toggle */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setView('grid')}
            title="Grid view"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              view === 'grid' ? 'bg-white shadow-sm text-[#300a46]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">grid_view</span>
          </button>
          <button
            onClick={() => setView('list')}
            title="List view"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              view === 'list' ? 'bg-white shadow-sm text-[#300a46]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">list</span>
          </button>
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
          <h3 className="font-semibold text-[#300a46] text-base mb-1.5 font-heading">
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
              ? 'Projects you deactivate will appear here.'
              : 'Create your first project to get a widget snippet and start collecting feedback.'}
          </p>
          {!search && tab === 'active' && <CreateProjectDialog />}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((project) => (
            <GridCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-card">
          {filtered.map((project) => (
            <ListRow key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
