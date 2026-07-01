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
          <h1 className="text-lg font-bold text-[#111111] mb-2">Access denied</h1>
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
            <a className="flex items-center gap-2 shrink-0" href="/projects">
            <div className="w-8 h-8 bg-[#ff724f] rounded-lg flex items-center justify-center font-bold text-white text-sm">P</div>
            <span className="font-bold text-lg text-[#111111]">Pinmarks</span>
            </a>
            </div>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-[#111111]">{project.name}</span>
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
              <Link href={`/projects/${projectId}`} className="text-xs font-medium text-[#ff724f] hover:text-[#ff724f]">
                Open in dashboard →
              </Link>
            )}
            <GuestLogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#111111]">{project.name}</h1>
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
                        <Link href={`/guest/${projectId}/${fb.id}`} className="font-medium text-[#111111] hover:text-[#ff724f] truncate max-w-xs block">{fb.title || 'Untitled'}</Link>
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
        </div>
      </main>
    </div>
  );
}
