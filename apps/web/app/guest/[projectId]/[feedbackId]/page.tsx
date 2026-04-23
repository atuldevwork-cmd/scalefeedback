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
  // Strip ClickUp prefix — already shown in card header
  const stripped = body.replace(/^\[via ClickUp · .+?\]\n/, '');
  const idx = stripped.lastIndexOf(ATTACHMENT_MARKER);
  let text = stripped;
  let attachments: string[] = [];
  if (idx !== -1) {
    text = stripped.slice(0, idx).trimEnd();
    try { attachments = JSON.parse(stripped.slice(idx + ATTACHMENT_MARKER.length)); } catch { /* ignore */ }
  }
  const parts = text.split(/(@\w+(?:\s\w+)?)/g);
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
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <a className="flex items-center gap-2 shrink-0" href="/projects">
                <div className="w-8 h-8 bg-[#ff724f] rounded-lg flex items-center justify-center font-bold text-white text-sm">SF</div>
                <span className="font-bold text-lg text-[#300a46]">ScaleFeedback</span>
              </a>
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

      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
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
                  const cuMatch = comment.body.match(/^\[via ClickUp · (.+?)\]\n/);
                  const isClickUp = !!cuMatch;
                  const cuAuthor = cuMatch?.[1] ?? '';

                  return (
                    <div key={comment.id} className={`bg-white rounded-2xl border p-4 ${isMine ? 'border-[#ff724f]/20 bg-[#fff9f8]' : 'border-gray-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isClickUp ? (
                            <div className="w-7 h-7 rounded-full bg-[#7b68ee] flex items-center justify-center font-bold text-white text-xs">C</div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#ff724f]/10 flex items-center justify-center text-[#ff724f] font-bold text-xs">
                              {(commenter?.name ?? '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-[#300a46]">
                              {isClickUp ? 'ClickUp' : (commenter?.name ?? 'Unknown')}
                              {isMine && !isClickUp && <span className="ml-1.5 text-[10px] text-[#ff724f] font-normal">(you)</span>}
                            </p>
                            {isClickUp ? (
                              <span className="inline-flex items-center gap-1 bg-[#7b68ee]/10 text-[#7b68ee] text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5">
                                <svg width="9" height="9" viewBox="0 0 32 32" fill="none" className="shrink-0">
                                  <path d="M4 22.4L8.3 18.7C10.7 21.4 13.2 22.7 16 22.7C18.8 22.7 21.2 21.4 23.6 18.7L28 22.3C24.6 26.2 20.6 28.3 16 28.3C11.4 28.3 7.4 26.2 4 22.4Z" fill="#8930FD"/>
                                  <path d="M16 8.2L8.2 14.9L4.6 10.6L16 0.8L27.4 10.6L23.8 14.9L16 8.2Z" fill="#FF02F0"/>
                                </svg>
                                {cuAuthor} via ClickUp
                              </span>
                            ) : (
                              <p className="text-[10px] text-gray-400">{commenter?.email}</p>
                            )}
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
        </div>
      </main>
    </div>
  );
}
