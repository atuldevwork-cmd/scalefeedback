import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { NotificationBell } from '@/components/notification-bell';
import { GuestLogoutButton } from '@/components/guest-logout-button';

interface Props {
  params: Promise<{ projectId: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  resolved: 'bg-green-50 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-50 text-red-700',
  high: 'bg-orange-50 text-orange-700',
  medium: 'bg-yellow-50 text-yellow-700',
  low: 'bg-gray-100 text-gray-500',
};

export default async function GuestProjectPage({ params }: Props) {
  const { projectId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/guest/${projectId}`);

  const service = await createServiceClient();

  // Verify guest access
  const { data: guestAccess } = await service
    .from('project_guests')
    .select('id, email, accepted_at')
    .eq('project_id', projectId)
    .eq('email', user.email ?? '')
    .single();

  // Also allow workspace members
  const { data: project } = await service
    .from('projects')
    .select('id, name, organisation_id, widget_config')
    .eq('id', projectId)
    .single();

  if (!project) redirect('/login');

  const { data: membership } = await service
    .from('members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organisation_id', project.organisation_id)
    .single();

  if (!guestAccess && !membership) {
    return (
      <div className="min-h-screen bg-[#f9f9fb] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-red-500 text-[28px]">lock</span>
          </div>
          <h1 className="text-lg font-bold text-[#300a46] mb-2">Access denied</h1>
          <p className="text-gray-500 text-sm mb-6">You don&apos;t have access to this project.</p>
          <Link href="/projects" className="inline-flex items-center gap-2 text-[#ff724f] font-semibold text-sm">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Fetch feedback
  const { data: feedbackList } = await service
    .from('feedback')
    .select('id, title, description, status, priority, created_at, reporter_name, reporter_email, browser, os, page_url')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  const isGuest = !!guestAccess && !membership;

  return (
    <div className="min-h-screen bg-[#f9f9fb]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg width="28" height="11" viewBox="0 0 67 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M52.6249 20.8102C55.174 20.8102 57.2471 18.7396 57.2471 16.1792C57.2471 13.6187 55.1805 11.5482 52.6249 11.5482C50.0693 11.5482 48.0026 13.6187 48.0026 16.1792C48.0026 18.7396 50.0693 20.8102 52.6249 20.8102ZM52.6249 14.0825C53.7853 14.0825 54.7176 15.0231 54.7176 16.1792C54.7176 17.3353 53.7788 18.2759 52.6249 18.2759C51.4709 18.2759 50.5321 17.3353 50.5321 16.1792C50.5321 15.0231 51.4709 14.0825 52.6249 14.0825ZM60.6959 13.1093C61.2501 13.5926 62.065 13.5926 62.6191 13.1093C64.2164 11.731 67.2479 8.70684 67.2479 5.59772C67.2479 2.4886 64.7445 0 61.6608 0C58.5771 0 56.0736 2.5082 56.0736 5.59772C56.0736 8.68725 59.1052 11.718 60.7024 13.1093H60.6959ZM58.5901 5.59772C58.5901 3.89946 59.9592 2.52779 61.6543 2.52779C63.3493 2.52779 64.7184 3.89946 64.7184 5.59772C64.7184 7.29598 63.3493 8.66765 61.6543 8.66765C59.9592 8.66765 58.5901 7.29598 58.5901 5.59772ZM52.6184 27.1525C50.0693 27.1525 47.9961 29.2231 47.9961 31.7836C47.9961 34.344 50.0627 36.4146 52.6184 36.4146C55.174 36.4146 57.2406 34.344 57.2406 31.7836C57.2406 29.2231 55.174 27.1525 52.6184 27.1525ZM52.6184 33.8803C51.4579 33.8803 50.5256 32.9397 50.5256 31.7836C50.5256 30.6274 51.4644 29.6869 52.6184 29.6869C53.7723 29.6869 54.7111 30.6274 54.7111 31.7836C54.7111 32.9397 53.7723 33.8803 52.6184 33.8803ZM60.6829 19.3536C58.1338 19.3536 56.0606 21.4242 56.0606 23.9846C56.0606 26.5451 58.1273 28.6157 60.6829 28.6157C63.2385 28.6157 65.3051 26.5451 65.3051 23.9846C65.3051 21.4242 63.2385 19.3536 60.6829 19.3536ZM60.6829 26.0813C59.5224 26.0813 58.5901 25.1408 58.5901 23.9846C58.5901 22.8285 59.5289 21.8879 60.6829 21.8879C61.8368 21.8879 62.7756 22.8285 62.7756 23.9846C62.7756 25.1408 61.8368 26.0813 60.6829 26.0813Z" fill="#FF724F"/>
              </svg>
              <div>
                <p className="text-[#300a46] font-semibold text-xs leading-none">ScaleStation</p>
                <p className="text-[#ff724f] text-[8px] font-semibold tracking-widest uppercase">Feedback</p>
              </div>
            </div>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-[#300a46]">{project.name}</span>
            {isGuest && (
              <span className="text-xs bg-[#fff3f0] text-[#ff724f] font-semibold px-2 py-0.5 rounded-full border border-[#ff724f]/20">
                Guest view
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{user.email}</span>
            <NotificationBell isGuest />
            {!isGuest && (
              <Link href={`/projects/${projectId}`} className="text-xs font-medium text-[#ff724f] hover:text-[#e8603a]">
                Open in dashboard →
              </Link>
            )}
            <GuestLogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#300a46]">{project.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{feedbackList?.length ?? 0} feedback items</p>
          </div>
        </div>

        {!feedbackList || feedbackList.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-gray-400 text-[24px]">inbox</span>
            </div>
            <p className="text-gray-500 text-sm">No feedback submitted yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Title</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Priority</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Reporter</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {feedbackList.map((fb) => (
                  <tr key={fb.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/guest/${projectId}/${fb.id}`} className="font-medium text-[#300a46] hover:text-[#ff724f] truncate max-w-xs block">{fb.title || 'Untitled'}</Link>
                      {fb.page_url && <div className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{fb.page_url}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[fb.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {fb.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {fb.priority && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_COLORS[fb.priority] ?? 'bg-gray-100 text-gray-500'}`}>
                          {fb.priority}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs text-gray-700">{fb.reporter_name || '—'}</div>
                      {fb.reporter_email && <div className="text-xs text-gray-400">{fb.reporter_email}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(fb.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
