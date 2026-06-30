import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface Props {
  searchParams: Promise<{ s?: string }>;
}

export default async function GuestJoinPage({ searchParams }: Props) {
  const { s } = await searchParams;

  if (!s) redirect('/login');

  // Use the SECURITY DEFINER RPC — works for anon users, bypasses RLS
  const supabase = await createClient();
  const { data: rows } = await supabase
    .rpc('get_project_by_guest_secret', { p_secret: s });

  const project = (rows as { id: string; name: string }[] | null)?.[0] ?? null;

  if (!project) {
    return <ErrorPage message="This invite link is invalid or has been revoked." />;
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const service = await createServiceClient();

    // Check if already a guest
    const { data: existing } = await service
      .from('project_guests')
      .select('id, accepted_at')
      .eq('project_id', project.id)
      .eq('email', user.email ?? '')
      .single();

    if (existing) {
      if (!existing.accepted_at) {
        await service
          .from('project_guests')
          .update({ accepted_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
      // Also clean up empty workspace in case they were added before but workspace wasn't cleaned
      const { data: memberships } = await service
        .from('members')
        .select('organisation_id')
        .eq('user_id', user.id)
        .eq('role', 'owner');
      for (const m of memberships ?? []) {
        const [{ count: memberCount }, { count: projectCount }] = await Promise.all([
          service.from('members').select('id', { count: 'exact', head: true }).eq('organisation_id', m.organisation_id),
          service.from('projects').select('id', { count: 'exact', head: true }).eq('organisation_id', m.organisation_id),
        ]);
        if (memberCount === 1 && projectCount === 0) {
          await service.from('members').delete().eq('organisation_id', m.organisation_id).eq('user_id', user.id);
          await service.from('organisations').delete().eq('id', m.organisation_id);
        }
      }
      redirect(`/guest/${project.id}`);
    }

    // Auto-add as guest (expires in 90 days)
    const expires = new Date();
    expires.setDate(expires.getDate() + 90);

    await service.from('project_guests').insert({
      project_id: project.id,
      email: user.email ?? '',
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      token: crypto.randomUUID(),
      accepted_at: new Date().toISOString(),
      expires_at: expires.toISOString(),
    });

    // Clean up the auto-created empty workspace if this user signed up purely as a guest.
    // The handle_new_user() trigger always creates an org at signup — but at that point the
    // guest's email isn't in project_guests yet, so the guard is bypassed.
    // Safe check: only delete an org where this user is the sole member AND it has 0 projects.
    const { data: memberships } = await service
      .from('members')
      .select('organisation_id')
      .eq('user_id', user.id)
      .eq('role', 'owner');

    for (const m of memberships ?? []) {
      const [{ count: memberCount }, { count: projectCount }] = await Promise.all([
        service.from('members').select('id', { count: 'exact', head: true }).eq('organisation_id', m.organisation_id),
        service.from('projects').select('id', { count: 'exact', head: true }).eq('organisation_id', m.organisation_id),
      ]);
      if (memberCount === 1 && projectCount === 0) {
        await service.from('members').delete().eq('organisation_id', m.organisation_id).eq('user_id', user.id);
        await service.from('organisations').delete().eq('id', m.organisation_id);
      }
    }

    redirect(`/guest/${project.id}`);
  }

  // Not logged in — show sign in / sign up prompt
  const next = `/guest/join?s=${s}`;

  return (
    <div className="min-h-screen bg-[#f9f9fb] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#fff3f0] flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined text-[#ff724f] text-[28px]">visibility</span>
        </div>
        <h1 className="text-xl font-bold text-[#111111] mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
          You&apos;re invited to view
        </h1>
        <p className="text-[#111111] font-semibold text-base mb-1">{project.name}</p>
        <p className="text-gray-500 text-sm mb-6">Sign in or create a free account to access this project&apos;s feedback.</p>
        <div className="space-y-3">
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="flex items-center justify-center gap-2 w-full bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">login</span>
            Sign in to view project
          </Link>
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="flex items-center justify-center gap-2 w-full border border-gray-200 text-[#111111] font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Create a free account
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-6">No workspace subscription required for guests.</p>
      </div>
    </div>
  );
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#f9f9fb] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined text-red-500 text-[28px]">link_off</span>
        </div>
        <h1 className="text-lg font-bold text-[#111111] mb-2">Invalid link</h1>
        <p className="text-gray-500 text-sm mb-6">{message}</p>
        <Link href="/login" className="inline-flex items-center gap-2 text-[#ff724f] font-semibold text-sm hover:text-[#ff724f]">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to login
        </Link>
      </div>
    </div>
  );
}
