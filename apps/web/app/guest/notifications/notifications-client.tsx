'use client';

import { useRouter } from 'next/navigation';
import { FormattedDate } from '@/components/formatted-date';
import { NotificationBell } from '@/components/notification-bell';
import { GuestLogoutButton } from '@/components/guest-logout-button';

interface Notification {
  id: string;
  type: 'comment' | 'status_change' | 'assigned';
  title: string;
  body?: string;
  feedback_id?: string;
  project_id?: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, string> = {
  comment: 'chat',
  status_change: 'swap_horiz',
  assigned: 'person_pin',
};

const TYPE_COLOR: Record<string, string> = {
  comment: 'text-[#ff724f] bg-[#fff3f0]',
  status_change: 'text-blue-600 bg-blue-50',
  assigned: 'text-purple-600 bg-purple-50',
};

export function GuestNotificationsClient({ notifications, userEmail }: { notifications: Notification[]; userEmail?: string }) {
  const router = useRouter();

  function handleClick(n: Notification) {
    if (n.feedback_id && n.project_id) {
      router.push(`/guest/${n.project_id}/${n.feedback_id}`);
    }
  }

  return (
    <div>
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a className="flex items-center gap-2 shrink-0" href="/projects">
              <div className="w-8 h-8 bg-[#ff724f] rounded-lg flex items-center justify-center font-bold text-white text-sm">SF</div>
              <span className="font-bold text-lg text-[#300a46]">ScaleFeedback</span>
            </a>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-[#300a46]">Notifications</span>
            <span className="text-xs bg-[#fff3f0] text-[#ff724f] font-semibold px-2 py-0.5 rounded-full border border-[#ff724f]/20">
              Guest view
            </span>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && <span className="text-xs text-gray-400">{userEmail}</span>}
            <NotificationBell isGuest noLink />
            <GuestLogoutButton />
          </div>
        </div>
      </header>

      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-[#300a46] mb-1">Notifications</h1>
          <p className="text-sm text-gray-400 mb-6">All your recent activity in one place.</p>

          {notifications.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center">
              <span className="material-symbols-outlined text-gray-200 text-[56px] block mb-3">notifications_none</span>
              <p className="text-gray-400 text-sm">No notifications yet</p>
              <p className="text-gray-300 text-xs mt-1">You'll see comments, status changes, and assignments here.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  disabled={!n.feedback_id}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex gap-4 disabled:cursor-default"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${TYPE_COLOR[n.type] ?? 'text-gray-500 bg-gray-100'}`}>
                    <span className="material-symbols-outlined text-[18px]">{TYPE_ICON[n.type] ?? 'circle'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-semibold text-[#300a46] leading-snug">
                        {n.title}
                      </p>
                      <FormattedDate date={n.created_at} className="text-[13px] text-gray-500 shrink-0 mt-0.5" />
                    </div>
                    {n.body && (
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">{n.body}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
