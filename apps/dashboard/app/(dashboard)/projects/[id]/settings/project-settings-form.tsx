'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Project } from '@pinmarks/shared';

interface Props {
  project: Project;
}

export function ProjectSettingsForm({ project }: Props) {
  const [name, setName] = useState(project.name);
  const [domain, setDomain] = useState(project.domain ?? '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await supabase
      .from('projects')
      .update({ name: name.trim(), domain: domain.trim() || null })
      .eq('id', project.id);

    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Project name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="client-site.com"
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/50"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
      >
        {saved ? 'Saved!' : loading ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
}
