import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) redirect('/login');

  const service = await createServiceClient();

  // Look up the invitation
  const { data: invitation } = await service
    .from('invitations')
    .select('id, organisation_id, email, role, accepted_at, expires_at, organisations(name)')
    .eq('token', token)
    .single();

  if (!invitation) {
    return <ErrorPage message="This invitation link is invalid or has already been used." />;
  }

  if (invitation.accepted_at) {
    return <ErrorPage message="This invitation has already been accepted." />;
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return <ErrorPage message="This invitation link has expired. Ask the workspace owner to send a new one." />;
  }

  const orgName = (invitation.organisations as unknown as { name: string } | null)?.name ?? 'the workspace';

  // Check if user is logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Verify the email matches (optional but good security practice)
    if (user.email && invitation.email && user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return (
        <div className="min-h-screen bg-[#f9f9fb] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md text-center">
            <div className="w-14 h-14 rounded-2xl bg-yellow-50 flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-yellow-600 text-[28px]">warning</span>
            </div>
            <h1 className="text-lg font-bold text-[#300a46] mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
              Wrong account
            </h1>
            <p className="text-gray-500 text-sm mb-1">
              This invitation was sent to <strong className="text-gray-700">{invitation.email}</strong>.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              You&apos;re signed in as <strong className="text-gray-700">{user.email}</strong>.
            </p>
            <Link
              href={`/login?next=/auth/accept-invite?token=${token}`}
              className="inline-flex items-center gap-2 bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
            >
              Sign in with the correct account
            </Link>
          </div>
        </div>
      );
    }

    // Add user to org
    await service.from('members').upsert(
      {
        organisation_id: invitation.organisation_id,
        user_id: user.id,
        role: invitation.role,
        accepted_at: new Date().toISOString(),
      },
      { onConflict: 'organisation_id,user_id', ignoreDuplicates: true }
    );

    // Mark invitation as accepted
    await service
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    redirect(`/projects?joined=1&org=${invitation.organisation_id}`);
  }

  // Not logged in — show landing page
  return (
    <div className="min-h-screen bg-[#f9f9fb] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#fff3f0] flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined text-[#ff724f] text-[28px]">mark_email_read</span>
        </div>

        <h1 className="text-xl font-bold text-[#300a46] mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
          You&apos;ve been invited
        </h1>
        <p className="text-gray-500 text-sm mb-1">Join as <strong className="text-gray-700">{invitation.role}</strong> in</p>
        <p className="text-[#300a46] font-semibold text-base mb-6">{orgName}</p>

        <div className="space-y-3">
          <Link
            href={`/signup?next=/auth/accept-invite?token=${token}`}
            className="flex items-center justify-center gap-2 w-full bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Create account &amp; accept
          </Link>
          <Link
            href={`/login?next=/auth/accept-invite?token=${token}`}
            className="flex items-center justify-center gap-2 w-full border border-gray-200 text-[#300a46] font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-[16px]">login</span>
            Sign in &amp; accept
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Sent to <strong>{invitation.email}</strong>
        </p>
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
        <h1 className="text-lg font-bold text-[#300a46] mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
          Invalid invitation
        </h1>
        <p className="text-gray-500 text-sm mb-6">{message}</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[#ff724f] font-semibold text-sm hover:text-[#e8603a]"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to login
        </Link>
      </div>
    </div>
  );
}
