import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { GuestUserMenu } from './guest-user-menu';
import { GuestProjectsClient } from './guest-projects-client';

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
    .map((r) => {
      const project = r.projects as unknown as { id: string; name: string } | null;
      return project ? { id: project.id, name: project.name, invitedAt: r.created_at } : null;
    })
    .filter((p): p is { id: string; name: string; invitedAt: string } => !!p);

  if (projects.length === 0) redirect('/no-access');
  if (projects.length === 1) redirect(`/guest/${projects[0].id}`);

  return (
    <div className="min-h-screen bg-[#f9f9fb]">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a className="flex items-center gap-2 shrink-0" href="/guest">
            <div className="w-8 h-8 bg-[#ff724f] rounded-lg flex items-center justify-center font-bold text-white text-sm">P</div>
            <span className="font-bold text-lg text-[#111111]">Pinmarks</span>
          </a>
          <div className="flex items-center gap-3">
            <GuestUserMenu email={user.email ?? undefined} />
          </div>
        </div>
      </header>

      <main className="px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <GuestProjectsClient projects={projects} />
        </div>
      </main>
    </div>
  );
}
