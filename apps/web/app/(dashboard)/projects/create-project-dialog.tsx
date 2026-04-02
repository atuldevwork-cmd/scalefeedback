'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-[#fff3f0] rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[#ff724f] text-[18px]">create_new_folder</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-[#300a46] font-heading">New Project</h2>
                <p className="text-xs text-gray-500">One project per website</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Project name <span className="text-[#ff724f]">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Client Site"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Domain <span className="text-gray-400 normal-case font-normal">(optional)</span>
                </label>
                <input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="client-site.com"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 border border-gray-200 text-gray-600 font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm disabled:opacity-60 shadow-sm"
                >
                  {loading ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
