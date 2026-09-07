import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { GuestLogoutButton } from '@/components/guest-logout-button';

export default async function GuestHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/guest');

  const service = await createServiceClient();

  const { data: guestRows } = await service
    .from('project_guests')
    .select('project_id, created_at, projects(id, name)')
    .eq('email', user.email ?? '')
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: false });

  const projects = (guestRows ?? [])
    .map((r) => r.projects as unknown as { id: string; name: string } | null)
    .filter((p): p is { id: string; name: string } => !!p);

  if (projects.length === 0) redirect('/no-access');
  if (projects.length === 1) redirect(`/guest/${projects[0].id}`);

  return (
    <div className="min-h-screen bg-[#f9f9fb]">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <a className="flex items-center gap-2 shrink-0" href="/guest">
            <div className="w-8 h-8 bg-[#ff724f] rounded-lg flex items-center justify-center font-bold text-white text-sm">P</div>
            <span className="font-bold text-lg text-[#111111]">Pinmarks</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{user.email}</span>
            <GuestLogoutButton />
          </div>
        </div>
      </header>

      <main className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-[#111111] mb-1">Your projects</h1>
          <p className="text-sm text-gray-500 mb-6">You have guest access to {projects.length} projects.</p>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
            {(guestRows ?? []).map((r) => {
              const project = r.projects as unknown as { id: string; name: string } | null;
              if (!project) return null;
              return (
                <a
                  key={project.id}
                  href={`/guest/${project.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div>
                    <div className="font-medium text-[#111111]">{project.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Invited {formatDate(r.created_at)}</div>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 text-[20px]">chevron_right</span>
                </a>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
