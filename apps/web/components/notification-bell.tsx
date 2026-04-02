'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/mock-data';

export function NotificationBell({ isGuest, noLink }: { isGuest?: boolean; noLink?: boolean }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    async function fetchUnread() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const { data } = await res.json();
          setUnread((data ?? []).filter((n: { is_read: boolean }) => !n.is_read).length);
        }
      } catch { /* ignore */ }
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, []);

  const badge = unread > 0 ? (
    <span className="min-w-[18px] h-[18px] bg-[#ff724f] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1 leading-none">
      {unread > 9 ? '9+' : unread}
    </span>
  ) : null;

  if (noLink) {
    return badge;
  }

  const href = isGuest ? '/guest/notifications' : '/notifications';

  return (
    <Link
      href={href}
      className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-[#300a46] hover:bg-gray-100 transition-colors"
      aria-label="Notifications"
    >
      <span className="material-symbols-outlined text-[20px]">notifications</span>
      {unread > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-[#ff724f] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5 leading-none">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
