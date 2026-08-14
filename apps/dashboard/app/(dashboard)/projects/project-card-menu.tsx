'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import type { Project } from '@pinmarks/shared';

interface Props {
  project: Project;
}

export function ProjectCardMenu({ project }: Props) {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleArchiveToggle() {
    setOpen(false);
    const { error } = await supabase
      .from('projects')
      .update({ is_active: !project.is_active })
      .eq('id', project.id);

    if (error) {
      toast(error.message, 'error');
    } else {
      toast(
        project.is_active
          ? `"${project.name}" has been archived.`
          : `"${project.name}" has been restored.`
      );
      router.refresh();
    }
  }

  async function handleDelete() {
    if (confirm !== project.name) return;
    setLoading(true);

    const { error } = await supabase.from('projects').delete().eq('id', project.id);

    if (error) {
      toast(error.message, 'error');
      setLoading(false);
      return;
    }

    toast(`"${project.name}" has been deleted.`);
    setDeleteOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="relative shrink-0" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Project options"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">more_vert</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 z-20">
          <Link
            href={`/projects/${project.id}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-gray-400">edit</span>
            Feedback
          </Link>
          <Link
            href={`/projects/${project.id}/settings#widget-installation`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-gray-400">widgets</span>
            Widget
          </Link>
          <Link
            href={`/projects/${project.id}/settings`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-gray-400">settings</span>
            Settings
          </Link>

          <div className="h-px bg-gray-100 my-1" />

          <button
            onClick={handleArchiveToggle}
            className="flex items-center gap-2.5 px-3.5 py-2 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
          >
            <span className="material-symbols-outlined text-[16px] text-gray-400">
              {project.is_active ? 'inventory_2' : 'unarchive'}
            </span>
            {project.is_active ? 'Archive' : 'Restore'}
          </button>

          <button
            onClick={() => {
              setOpen(false);
              setDeleteOpen(true);
            }}
            className="flex items-center gap-2.5 px-3.5 py-2 text-[14px] text-red-600 hover:bg-red-50 transition-colors w-full text-left"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Delete permanently
          </button>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-red-600 text-[20px]">delete</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delete Project</h2>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              All feedback, screenshots, and settings for <strong>{project.name}</strong> will be permanently deleted.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <strong>{project.name}</strong> to confirm
              </label>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={project.name}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteOpen(false);
                  setConfirm('');
                }}
                className="flex-1 border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirm !== project.name || loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {loading ? 'Deleting…' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
