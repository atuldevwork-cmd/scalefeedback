import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { NotificationBell } from '@/components/notification-bell';
import { GuestLogoutButton } from '@/components/guest-logout-button';
import { GuestCommentForm } from './comment-form';
import { GuestStatusSelect } from './status-select';
import { ScreenshotLightbox } from '@/components/screenshot-lightbox';

interface Props {
  params: Promise<{ projectId: string; feedbackId: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  resolved: 'bg-green-50 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
  wont_fix: 'bg-red-50 text-red-600',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-50 text-red-700',
  high: 'bg-orange-50 text-orange-700',
  medium: 'bg-yellow-50 text-yellow-700',
  low: 'bg-gray-100 text-gray-500',
};

const ATTACHMENT_MARKER = '__attachments__:';

function GuestCommentBody({ body }: { body: string }) {
  const idx = body.lastIndexOf(ATTACHMENT_MARKER);
  let text = body;
  let attachments: string[] = [];
  if (idx !== -1) {
    text = body.slice(0, idx).trimEnd();
    try { attachments = JSON.parse(body.slice(idx + ATTACHMENT_MARKER.length)); } catch { /* ignore */ }
  }
  const parts = text.split(/(@\w[\w\s]*)/g);
  return (
    <div className="text-sm text-gray-700 leading-relaxed">
      <p className="whitespace-pre-wrap">
        {parts.map((part, i) =>
          part.startsWith('@')
            ? <span key={i} className="text-[#ff724f] font-semibold">{part}</span>
            : part
        )}
      </p>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {attachments.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} alt={`attachment-${i + 1}`} className="h-24 w-auto object-cover rounded-lg border border-gray-200 hover:border-[#ff724f] transition-colors" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function GuestFeedbackDetailPage({ params }: Props) {
  const { projectId, feedbackId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/guest/${projectId}/${feedbackId}`);

  const service = createServiceClient();

  // Verify project access
  const { data: project } = await service
    .from('projects')
    .select('id, name, organisation_id')
    .eq('id', projectId)
    .single();
  if (!project) redirect('/login');

  const [{ data: guestAccess }, { data: membership }] = await Promise.all([
    service
      .from('project_guests')
      .select('id')
      .eq('project_id', projectId)
      .eq('email', user.email ?? '')
      .not('accepted_at', 'is', null)
      .single(),
    service
      .from('members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organisation_id', project.organisation_id)
      .single(),
  ]);

  if (!guestAccess && !membership) redirect(`/guest/${projectId}`);

  // Fetch feedback
  const { data: feedback } = await service
    .from('feedback')
    .select('id, title, description, status, priority, type, created_at, reporter_name, reporter_email, page_url, browser, os, screenshot_url')
    .eq('id', feedbackId)
    .eq('project_id', projectId)
    .single();

  if (!feedback) redirect(`/guest/${projectId}`);

  // Fetch non-internal comments with commenter info
  const { data: comments } = await service
    .from('comments')
    .select('id, body, created_at, user_id, is_internal')
    .eq('feedback_id', feedbackId)
    .eq('is_internal', false)
    .order('created_at', { ascending: true });

  // Resolve commenter display names + org members for @mention
  const commenterIds = [...new Set((comments ?? []).map((c: { user_id: string }) => c.user_id).filter(Boolean))];
  let commenterMap: Record<string, { email: string; name: string }> = {};
  let orgMembers: { user_id: string; email: string; name: string }[] = [];

  const [{ data: usersResp }, { data: memberRows }, { data: projectGuests }] = await Promise.all([
    service.auth.admin.listUsers(),
    service.from('members').select('user_id').eq('organisation_id', project.organisation_id),
    service.from('project_guests').select('email, name').eq('project_id', projectId).not('accepted_at', 'is', null),
  ]);

  const memberIds = (memberRows ?? []).map((m: { user_id: string }) => m.user_id);

  for (const u of usersResp?.users ?? []) {
    const name = u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email ?? 'Unknown';
    if (commenterIds.includes(u.id)) {
      commenterMap[u.id] = { email: u.email ?? '', name };
    }
    if (memberIds.includes(u.id)) {
      orgMembers.push({ user_id: u.id, email: u.email ?? '', name });
    }
  }

  // Also add other project guests so they can be @mentioned
  for (const g of projectGuests ?? []) {
    if (g.email && !orgMembers.some((m) => m.email === g.email)) {
      orgMembers.push({ user_id: g.email, email: g.email, name: g.name ?? g.email });
    }
  }

  const isGuest = !!guestAccess && !membership;
  const screenshotUrl = feedback.screenshot_url
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/screenshots/${feedback.screenshot_url}`
    : null;

  return (
    <div className="min-h-screen bg-[#f9f9fb]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="28" height="11" viewBox="0 0 67 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M52.6249 20.8102C55.174 20.8102 57.2471 18.7396 57.2471 16.1792C57.2471 13.6187 55.1805 11.5482 52.6249 11.5482C50.0693 11.5482 48.0026 13.6187 48.0026 16.1792C48.0026 18.7396 50.0693 20.8102 52.6249 20.8102ZM52.6249 14.0825C53.7853 14.0825 54.7176 15.0231 54.7176 16.1792C54.7176 17.3353 53.7788 18.2759 52.6249 18.2759C51.4709 18.2759 50.5321 17.3353 50.5321 16.1792C50.5321 15.0231 51.4709 14.0825 52.6249 14.0825ZM60.6959 13.1093C61.2501 13.5926 62.065 13.5926 62.6191 13.1093C64.2164 11.731 67.2479 8.70684 67.2479 5.59772C67.2479 2.4886 64.7445 0 61.6608 0C58.5771 0 56.0736 2.5082 56.0736 5.59772C56.0736 8.68725 59.1052 11.718 60.7024 13.1093H60.6959ZM58.5901 5.59772C58.5901 3.89946 59.9592 2.52779 61.6543 2.52779C63.3493 2.52779 64.7184 3.89946 64.7184 5.59772C64.7184 7.29598 63.3493 8.66765 61.6543 8.66765C59.9592 8.66765 58.5901 7.29598 58.5901 5.59772ZM52.6184 27.1525C50.0693 27.1525 47.9961 29.2231 47.9961 31.7836C47.9961 34.344 50.0627 36.4146 52.6184 36.4146C55.174 36.4146 57.2406 34.344 57.2406 31.7836C57.2406 29.2231 55.174 27.1525 52.6184 27.1525ZM52.6184 33.8803C51.4579 33.8803 50.5256 32.9397 50.5256 31.7836C50.5256 30.6274 51.4644 29.6869 52.6184 29.6869C53.7723 29.6869 54.7111 30.6274 54.7111 31.7836C54.7111 32.9397 53.7723 33.8803 52.6184 33.8803ZM60.6829 19.3536C58.1338 19.3536 56.0606 21.4242 56.0606 23.9846C56.0606 26.5451 58.1273 28.6157 60.6829 28.6157C63.2385 28.6157 65.3051 26.5451 65.3051 23.9846C65.3051 21.4242 63.2385 19.3536 60.6829 19.3536ZM60.6829 26.0813C59.5224 26.0813 58.5901 25.1408 58.5901 23.9846C58.5901 22.8285 59.5289 21.8879 60.6829 21.8879C61.8368 21.8879 62.7756 22.8285 62.7756 23.9846C62.7756 25.1408 61.8368 26.0813 60.6829 26.0813Z" fill="#FF724F"/>
            </svg>
            <div>
              <p className="text-[#300a46] font-semibold text-xs leading-none">ScaleStation</p>
              <p className="text-[#ff724f] text-[8px] font-semibold tracking-widest uppercase">Feedback</p>
            </div>
            <span className="text-gray-300">/</span>
            <Link href={`/guest/${projectId}`} className="text-sm font-semibold text-[#300a46] hover:text-[#ff724f]">
              {project.name}
            </Link>
            {isGuest && (
              <span className="text-xs bg-[#fff3f0] text-[#ff724f] font-semibold px-2 py-0.5 rounded-full border border-[#ff724f]/20">
                Guest view
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{user.email}</span>
            <NotificationBell isGuest />
            <GuestLogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Back link */}
        <Link href={`/guest/${projectId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#ff724f]">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to all feedback
        </Link>

        {/* Feedback card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-lg font-bold text-[#300a46]">{feedback.title || 'Untitled'}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <GuestStatusSelect feedbackId={feedbackId} currentStatus={feedback.status} />
              {feedback.priority && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_COLORS[feedback.priority] ?? 'bg-gray-100 text-gray-500'}`}>
                  {feedback.priority}
                </span>
              )}
            </div>
          </div>

          {feedback.description && (
            <p className="text-gray-700 text-sm leading-relaxed mb-4">{feedback.description}</p>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-gray-400 border-t border-gray-50 pt-4">
            {feedback.reporter_name && <span>Reporter: <span className="text-gray-600">{feedback.reporter_name}</span></span>}
            {feedback.reporter_email && <span>Email: <span className="text-gray-600">{feedback.reporter_email}</span></span>}
            {feedback.page_url && <span>Page: <span className="text-gray-600 truncate max-w-xs">{feedback.page_url}</span></span>}
            <span>Submitted: <span className="text-gray-600">{formatDate(feedback.created_at)}</span></span>
          </div>

          {screenshotUrl && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">Screenshot</p>
              <ScreenshotLightbox src={screenshotUrl} alt="Screenshot" />
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#300a46]">
            Comments {comments?.length ? `(${comments.length})` : ''}
          </h2>

          {!comments?.length ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-400">
              No comments yet. Be the first to leave a note.
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment: { id: string; body: string; created_at: string; user_id: string }) => {
                const commenter = commenterMap[comment.user_id];
                const isMine = comment.user_id === user.id;
                return (
                  <div key={comment.id} className={`bg-white rounded-2xl border p-4 ${isMine ? 'border-[#ff724f]/20 bg-[#fff9f8]' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#ff724f]/10 flex items-center justify-center text-[#ff724f] font-bold text-xs">
                          {(commenter?.name ?? '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#300a46]">
                            {commenter?.name ?? 'Unknown'}
                            {isMine && <span className="ml-1.5 text-[10px] text-[#ff724f] font-normal">(you)</span>}
                          </p>
                          <p className="text-[10px] text-gray-400">{commenter?.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400">{formatDate(comment.created_at)}</span>
                    </div>
                    <GuestCommentBody body={comment.body} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Comment form */}
          <GuestCommentForm feedbackId={feedbackId} members={orgMembers} />
        </div>
      </main>
    </div>
  );
}
