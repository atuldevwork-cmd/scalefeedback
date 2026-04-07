'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/spinner';

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: member } = await supabase
        .from('members')
        .select('organisation_id')
        .eq('user_id', user.id)
        .single();

      if (!member) throw new Error('No organisation found');

      const { error: insertError } = await supabase
        .from('projects')
        .insert({
          name: name.trim(),
          domain: domain.trim() || null,
          organisation_id: member.organisation_id,
        });

      if (insertError) throw insertError;

      // Brief pause so user sees the success state before close
      await new Promise((r) => setTimeout(r, 600));
      setOpen(false);
      setName('');
      setDomain('');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm shadow-sm"
      >
        <span className="material-symbols-outlined text-[16px]">add</span>
        New Project
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#300a46]/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-100 overflow-hidden">

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 z-10 bg-white/95 flex flex-col items-center justify-center gap-4 rounded-2xl">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-[#fff3f0] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#ff724f] text-[32px]">create_new_folder</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Spinner size={16} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#300a46]">Creating your project…</p>
                  <p className="text-xs text-gray-400 mt-1">Setting up your workspace</p>
                </div>
                <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#ff724f] rounded-full animate-[loading-bar_1.2s_ease-in-out_infinite]" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-[#fff3f0] rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[#ff724f] text-[18px]">create_new_folder</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-[#300a46] font-heading">New Project</h2>
                <p className="text-xs text-gray-500">One project per website</p>
              </div>
              <button
                onClick={() => !loading && setOpen(false)}
                className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-left text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Project name <span className="text-[#ff724f]">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Client Site"
                  required
                  disabled={loading}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-left text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Domain <span className="text-gray-400 normal-case font-normal">(optional)</span>
                </label>
                <input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="client-site.com"
                  disabled={loading}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all disabled:opacity-50"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="flex-1 border border-gray-200 text-gray-600 font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm disabled:opacity-60 shadow-sm flex items-center justify-center gap-2"
                >
                  {loading ? <><Spinner size={14} color="#fff" /> Creating…</> : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
