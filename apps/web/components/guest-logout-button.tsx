'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function GuestLogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-xs font-medium text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50 flex items-center gap-1"
    >
      <span className="material-symbols-outlined text-[14px]">logout</span>
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
