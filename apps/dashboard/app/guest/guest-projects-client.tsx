'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

interface GuestProject {
  id: string;
  name: string;
  invitedAt: string;
}

function ProjectAvatar({ name }: { name: string }) {
  return (
    <div className="w-10 h-10 rounded-xl bg-[#ff724f] flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function GridCard({ project }: { project: GuestProject }) {
  return (
    <a
      href={`/guest/${project.id}`}
      className="group block bg-white border border-gray-100 rounded-2xl p-5 hover:border-[#ff724f]/20 hover:shadow-card-hover transition-all"
    >
      <div className="mb-4">
        <ProjectAvatar name={project.name} />
      </div>
      <h3 className="font-semibold text-[#111111] text-sm group-hover:text-[#ff724f] transition-colors">
        {project.name}
      </h3>
      <p className="text-xs text-gray-400 mt-0.5">Invited {formatDate(project.invitedAt)}</p>
    </a>
  );
}

function ListRow({ project }: { project: GuestProject }) {
  return (
    <a
      href={`/guest/${project.id}`}
      className="group flex items-center gap-4 px-5 py-5 hover:bg-gray-50/60 transition-colors border-b border-gray-50 last:border-0"
    >
      <ProjectAvatar name={project.name} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#111111] group-hover:text-[#ff724f] transition-colors truncate">
          {project.name}
        </p>
      </div>
      <span className="text-xs text-gray-400 shrink-0 hidden sm:block">Invited {formatDate(project.invitedAt)}</span>
      <span className="material-symbols-outlined text-gray-300 group-hover:text-[#ff724f] text-[18px] transition-colors shrink-0">
        chevron_right
      </span>
    </a>
  );
}

export function GuestProjectsClient({ projects }: { projects: GuestProject[] }) {
  const [view, setView] = useState<ViewMode>('grid');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#111111]">Your projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">You have guest access to {projects.length} projects.</p>
        </div>

        <div className="flex items-center gap-0.5 bg-white border border-gray-100 rounded-xl p-1 shrink-0">
          {([
            { value: 'grid' as ViewMode, icon: 'grid_view', title: 'Grid view' },
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

      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project) => (
            <GridCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          {projects.map((project) => (
            <ListRow key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
