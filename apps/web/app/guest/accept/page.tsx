import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptGuestInvitePage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token) redirect('/login');

  const service = await createServiceClient();

  const { data: guest } = await service
    .from('project_guests')
    .select('id, project_id, email, name, accepted_at, expires_at, projects(name)')
    .eq('token', token)
    .single();

  if (!guest) {
    return <ErrorPage message="This guest invite link is invalid or has already been used." />;
  }

  if (new Date(guest.expires_at) < new Date()) {
    return <ErrorPage message="This invite link has expired. Ask the project owner to resend it." />;
  }

  const projectName = (guest.projects as unknown as { name: string } | null)?.name ?? 'the project';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Mark as accepted
    await service
      .from('project_guests')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', guest.id);

    redirect(`/guest/${guest.project_id}`);
  }

  return (
    <div className="min-h-screen bg-[#f9f9fb] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#fff3f0] flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined text-[#ff724f] text-[28px]">visibility</span>
        </div>
        <h1 className="text-xl font-bold text-[#300a46] mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
          Guest access invited
        </h1>
        <p className="text-gray-500 text-sm mb-1">You&apos;ve been invited to view</p>
        <p className="text-[#300a46] font-semibold text-base mb-1">{projectName}</p>
        {guest.email && (
          <p className="text-xs text-gray-400 mb-6">Sent to {guest.email}</p>
        )}
        <div className="space-y-3">
          <Link
            href={`/login?next=/guest/accept?token=${token}`}
            className="flex items-center justify-center gap-2 w-full bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">login</span>
            Sign in to view project
          </Link>
          <Link
            href={`/signup?next=/guest/accept?token=${token}`}
            className="flex items-center justify-center gap-2 w-full border border-gray-200 text-[#300a46] font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all text-sm"
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
        <h1 className="text-lg font-bold text-[#300a46] mb-2">Invalid link</h1>
        <p className="text-gray-500 text-sm mb-6">{message}</p>
        <Link href="/login" className="inline-flex items-center gap-2 text-[#ff724f] font-semibold text-sm hover:text-[#e8603a]">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to login
        </Link>
      </div>
    </div>
  );
}
