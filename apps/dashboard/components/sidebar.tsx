'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { marketingUrl } from '@/lib/marketing-url';
import { NotificationBell } from './notification-bell';
import { SupportInboxBadge } from './support-chat/inbox-badge';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: React.ReactNode;
  newTab?: boolean;
}

const BASE_NAV: NavItem[] = [
  { label: 'Projects', href: '/projects', icon: 'folder_open' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
  { label: 'Docs', href: '/docs', icon: 'article', newTab: true },
];

const AGENT_NAV_ITEM: NavItem = { label: 'Support Inbox', href: '/support', icon: 'support_agent', badge: <SupportInboxBadge /> };


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
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('support_agents').select('user_id').maybeSingle()
      .then(({ data }) => { if (data) setIsAgent(true); });
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserName(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '');
      setUserEmail(user.email ?? '');
      setAvatarUrl(user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null);
    });
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
              {...(item.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
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
          href="/settings/profile"
          className="flex items-center gap-2.5 px-3 py-2.5 mb-1 rounded-lg hover:bg-gray-50 transition-all"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#fff3f0] flex items-center justify-center text-xs font-bold text-[#111111] shrink-0">
              {(userName || userEmail || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#111111] truncate leading-tight">
              {userName || userEmail || 'Loading…'}
            </p>
            {userName && userEmail && (
              <p className="text-xs text-gray-400 truncate leading-tight">{userEmail}</p>
            )}
          </div>
        </Link>
        <Link
          href={marketingUrl('/contact')}
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
