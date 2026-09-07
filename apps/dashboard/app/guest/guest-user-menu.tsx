'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function GuestUserMenu({ email }: { email?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const initial = (email ?? '?').charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full hover:bg-gray-50 pl-0.5 pr-2 py-0.5 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-[#fff3f0] text-[#ff724f] flex items-center justify-center text-xs font-bold shrink-0">
          {initial}
        </div>
        <span className={`material-symbols-outlined text-[18px] text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50">
          {email && (
            <div className="px-3.5 py-3 border-b border-gray-50">
              <p className="text-[11px] text-gray-400">Signed in as</p>
              <p className="text-sm font-medium text-[#111111] truncate">{email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            {loading ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
