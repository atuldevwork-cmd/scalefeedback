'use client';

import { useEffect, useRef, useState } from 'react';

interface GuestProject {
  id: string;
  name: string;
}

interface Props {
  currentProjectId: string;
  currentProjectName: string;
  projects: GuestProject[];
}

export function GuestProjectSwitcher({ currentProjectId, currentProjectName, projects }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const others = projects.filter((p) => p.id !== currentProjectId);

  if (others.length === 0) {
    return <span className="text-sm font-semibold text-[#111111]">{currentProjectName}</span>;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm font-semibold text-[#111111] hover:text-[#ff724f] transition-colors -mx-1.5 px-1.5 py-0.5 rounded-lg hover:bg-gray-50"
      >
        {currentProjectName}
        <span className={`material-symbols-outlined text-[18px] text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50 py-1">
          <p className="px-3.5 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Your projects
          </p>
          {projects.map((p) => (
            <a
              key={p.id}
              href={`/guest/${p.id}`}
              className={`flex items-center justify-between px-3.5 py-2 text-sm transition-colors ${
                p.id === currentProjectId
                  ? 'bg-[#fff3f0] text-[#ff724f] font-semibold'
                  : 'text-[#111111] hover:bg-gray-50'
              }`}
            >
              {p.name}
              {p.id === currentProjectId && (
                <span className="material-symbols-outlined text-[16px]">check</span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
