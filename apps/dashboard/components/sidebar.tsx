'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from './notification-bell';
import { SupportInboxBadge } from './support-chat/inbox-badge';

const BASE_NAV: { label: string; href: string; icon: string; badge?: React.ReactNode }[] = [
  { label: 'Projects', href: '/projects', icon: 'folder_open' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
  { label: 'Docs', href: '/docs', icon: 'article' },
];

const AGENT_NAV_ITEM = { label: 'Support Inbox', href: '/support', icon: 'support_agent', badge: <SupportInboxBadge /> };


function NotificationSidebarItem() {
  return (
    <Link
      href="/notifications"
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[15px] font-medium text-[#111111]/60 hover:bg-gray-50 hover:text-[#111111] transition-all"
    >
      <span className="material-symbols-outlined text-[20px] text-[#111111]/30">notifications</span>
      <span className="flex-1">Notifications</span>
      <NotificationBell noLink />
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [isAgent, setIsAgent] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('support_agents').select('user_id').maybeSingle()
      .then(({ data }) => { if (data) setIsAgent(true); });
  }, []);

  const navItems = isAgent
    ? [BASE_NAV[0], AGENT_NAV_ITEM, ...BASE_NAV.slice(1)]
    : BASE_NAV;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <aside className="w-[240px] shrink-0 border-r border-gray-100 bg-white flex flex-col h-screen sticky top-0 shadow-[1px_0_0_0_#f0f0f5]">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-gray-100">
        <Link href="/projects" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-[#ff724f] rounded-lg flex items-center justify-center font-bold text-white text-sm">P</div>
          <span className="font-bold text-lg text-[#111111]">Pinmarks</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="text-[12px] font-semibold uppercase tracking-widest text-gray-400 px-3 mb-3">Workspace</p>
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[15px] font-medium transition-all',
                active
                  ? 'bg-[#fff3f0] text-[#111111]'
                  : 'text-[#111111]/60 hover:bg-gray-50 hover:text-[#111111]'
              )}
            >
              <span
                className={cn(
                  'material-symbols-outlined text-[20px]',
                  active ? 'text-[#ff724f]' : 'text-[#111111]/30'
                )}
              >
                {item.icon}
              </span>
              {item.label}
              {item.badge
                ? item.badge
                : active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ff724f]" />
              }
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
        <Link
          href="/contact"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[15px] font-medium text-[#111111]/60 hover:bg-gray-50 hover:text-[#111111] transition-all"
        >
          <span className="material-symbols-outlined text-[20px] text-[#111111]/30">contact_support</span>
          <span>Contact Us</span>
        </Link>
        <NotificationSidebarItem />
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[15px] font-medium text-gray-400 hover:bg-gray-50 hover:text-[#111111] transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
