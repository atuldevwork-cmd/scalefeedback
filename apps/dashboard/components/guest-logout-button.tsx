'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function GuestLogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
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
