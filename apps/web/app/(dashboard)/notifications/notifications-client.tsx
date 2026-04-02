'use client';

import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

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

export function NotificationsClient({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();

  function handleClick(n: Notification) {
    if (n.feedback_id && n.project_id) {
      router.push(`/projects/${n.project_id}/${n.feedback_id}`);
    }
  }

  return (
    <div className="p-8">
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
                  <span className="text-[13px] text-gray-500 shrink-0 mt-0.5">{formatDate(n.created_at)}</span>
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
  );
}
