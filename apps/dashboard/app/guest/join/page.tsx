import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { cleanupEmptyOwnerOrgs } from '@/lib/guest-cleanup';
import { GuestAuthForm } from '../guest-auth-form';

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
      await cleanupEmptyOwnerOrgs(service, user.id);
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

    await cleanupEmptyOwnerOrgs(service, user.id);

    redirect(`/guest/${project.id}`);
  }

  // Not logged in — single inline form handles both new and returning guests
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
        <p className="text-gray-500 text-sm mb-6">Set a password to access this project&apos;s feedback.</p>
        <GuestAuthForm mode="secret" secret={s} />
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
