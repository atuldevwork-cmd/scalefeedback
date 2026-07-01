'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';

interface Props {
  projectId: string;
  projectName: string;
  isActive: boolean;
}

export function ArchiveProjectButton({ projectId, projectName, isActive }: Props) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleArchive() {
    setLoading(true);
    const { error } = await supabase
      .from('projects')
      .update({ is_active: false })
      .eq('id', projectId);

    if (error) {
      toast(error.message, 'error');
      setLoading(false);
      return;
    }

    toast(`"${projectName}" has been archived.`);
    setOpen(false);
    router.refresh();
    setLoading(false);
  }

  async function handleRestore() {
    setLoading(true);
    const { error } = await supabase
      .from('projects')
      .update({ is_active: true })
      .eq('id', projectId);

    if (error) {
      toast(error.message, 'error');
      setLoading(false);
      return;
    }

    toast(`"${projectName}" has been restored.`);
    router.refresh();
    setLoading(false);
  }

  // ── Restore (no confirmation needed) ────────────────────────────────────────
  if (!isActive) {
    return (
      <button
        onClick={handleRestore}
        disabled={loading}
        className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors border border-green-200 disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[16px]">unarchive</span>
        {loading ? 'Restoring…' : 'Restore Project'}
      </button>
    );
  }

  // ── Archive (requires confirmation) ─────────────────────────────────────────
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors border border-amber-200"
      >
        <span className="material-symbols-outlined text-[16px]">inventory_2</span>
        Archive Project
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-amber-600 text-[20px]">inventory_2</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Archive Project?</h2>
                <p className="text-sm text-gray-500">You can restore it at any time.</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              <strong>{projectName}</strong> will be hidden from the active projects list and the widget will stop accepting new feedback. All existing feedback is kept.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={loading}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {loading ? 'Archiving…' : 'Archive Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
