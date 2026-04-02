import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ orgId: string }>;
}

export default async function JoinPage({ params }: Props) {
  const { orgId } = await params;

  const service = await createServiceClient();

  // Look up the organisation
  const { data: org } = await service
    .from('organisations')
    .select('id, name')
    .eq('id', orgId)
    .single();

  if (!org) redirect('/login');

  // Check if user is already logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Add user to org as member (ignore if already a member)
    await service.from('members').upsert(
      {
        organisation_id: orgId,
        user_id: user.id,
        role: 'member',
        accepted_at: new Date().toISOString(),
      },
      { onConflict: 'organisation_id,user_id', ignoreDuplicates: true }
    );

    redirect('/projects?joined=1');
  }

  // Not logged in — show join landing page
  return (
    <div className="min-h-screen bg-[#f9f9fb] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md text-center">
        {/* Logo mark */}
        <div className="w-14 h-14 rounded-2xl bg-[#fff3f0] flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined text-[#ff724f] text-[28px]">group_add</span>
        </div>

        <h1 className="text-xl font-bold text-[#300a46] mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
          You&apos;ve been invited
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          You&apos;ve been invited to join
        </p>
        <p className="text-[#300a46] font-semibold text-base mb-6">{org.name}</p>

        <div className="space-y-3">
          <Link
            href={`/signup?next=/join/${orgId}`}
            className="flex items-center justify-center gap-2 w-full bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Create an account &amp; join
          </Link>
          <Link
            href={`/login?next=/join/${orgId}`}
            className="flex items-center justify-center gap-2 w-full border border-gray-200 text-[#300a46] font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-[16px]">login</span>
            Sign in to an existing account
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          By joining you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
