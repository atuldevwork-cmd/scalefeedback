'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { isSupabaseConfigured } from '@/lib/mock-data';
import { FormattedDate } from '@/components/formatted-date';
import { createClient } from '@/lib/supabase/client';

const CLICKUP_PREFIX = /^\[via ClickUp · (.+?)\]\n/;
const ATTACHMENT_MARKER = '__attachments__:';
const POLL_INTERVAL = 3000;

/* ── Common emojis ──────────────────────────────────────────────────── */
const EMOJI_GROUPS = [
  { label: 'Smileys', emojis: ['😀','😄','😊','😍','🤔','😅','😂','🤣','😭','😢','😡','🤯','🥳','😎','🤩','🥺','😴','🤫','🤗','😬'] },
  { label: 'Gestures', emojis: ['👍','👎','👏','🙌','🤝','🙏','✌️','🤞','💪','👀','✅','❌','⚠️','🔥','💡','🚀','⭐','💯','❓','‼️'] },
  { label: 'Objects', emojis: ['🐛','🔗','📎','📌','🗂️','📋','✏️','🖊️','🔍','🔧','🔨','📱','💻','🖥️','📷','🎨','📝','📊','📈','🗓️'] },
];

/* ── Helpers ──────────────────────────────────────────────────────── */
function parseBody(raw: string): { text: string; attachments: string[] } {
  const idx = raw.lastIndexOf(ATTACHMENT_MARKER);
  if (idx === -1) return { text: raw, attachments: [] };
  const text = raw.slice(0, idx).trimEnd();
  try {
    const attachments: string[] = JSON.parse(raw.slice(idx + ATTACHMENT_MARKER.length));
    return { text, attachments };
  } catch {
    return { text: raw, attachments: [] };
  }
}

function buildBody(text: string, attachments: string[]): string {
  if (!attachments.length) return text;
  return `${text}\n${ATTACHMENT_MARKER}${JSON.stringify(attachments)}`;
}

/* ── CommentBody ──────────────────────────────────────────────────── */
function CommentBody({ body }: { body: string }) {
  // Strip the ClickUp prefix — the card header already shows author badge
  const rawText = body.replace(CLICKUP_PREFIX, '');
  const { text, attachments } = parseBody(rawText);
  return (
    <div className="text-sm text-gray-700 leading-relaxed">
      <p className="whitespace-pre-wrap">{renderMentions(text)}</p>
      <AttachmentGrid urls={attachments} />
    </div>
  );
}

function renderMentions(text: string): React.ReactNode {
  // Match @FirstName or @First Last — stops after at most one trailing space+word
  // so the rest of the sentence stays plain text
  const parts = text.split(/(@\w+(?:\s\w+)?)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-[#ff724f] font-semibold">{part}</span>
    ) : part
  );
}

function AttachmentGrid({ urls }: { urls: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (!urls.length) return null;
  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {urls.map((url, i) => (
          <button key={i} onClick={() => setLightbox(url)} className="rounded-lg overflow-hidden border border-gray-200 hover:border-[#ff724f] transition-colors">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`attachment-${i + 1}`} className="h-24 w-auto object-cover" />
          </button>
        ))}
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="preview" className="max-w-full max-h-full rounded-xl shadow-2xl" />
        </div>
      )}
    </>
  );
}

/* ── Types ────────────────────────────────────────────────────────── */
export interface OrgMember { user_id: string; email: string; name: string; }

interface ResolvedComment {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  user_id: string;
  userName: string;
  userEmail: string;
}

interface Props {
  feedbackId: string;
  initialComments: ResolvedComment[];
  currentUserId: string;
  members?: OrgMember[];
}

/* ── EmojiPicker ──────────────────────────────────────────────────── */
function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(ev: MouseEvent) {
      if (ref.current && !ref.current.contains(ev.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 z-20 w-72">
      {EMOJI_GROUPS.map((group) => (
        <div key={group.label} className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5 px-1">{group.label}</p>
          <div className="flex flex-wrap gap-0.5">
            {group.emojis.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => { onSelect(em); onClose(); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#fff3f0] text-lg transition-colors"
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── CommentThread ────────────────────────────────────────────────── */
export function CommentThread({ feedbackId, initialComments, currentUserId, members = [] }: Props) {
  const [comments, setComments] = useState<ResolvedComment[]>(initialComments);
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Emoji
  const [showEmoji, setShowEmoji] = useState(false);

  // @mention
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState(0); // cursor pos of '@'

  // Attachments
  const [attachments, setAttachments] = useState<string[]>([]); // public URLs
  const [uploading, setUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const latestTimestampRef = useRef<string>(
    initialComments.length ? initialComments[initialComments.length - 1].created_at : new Date(0).toISOString()
  );

  // Polling
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/comments?feedback_id=${feedbackId}&after=${encodeURIComponent(latestTimestampRef.current)}`);
        if (!res.ok) return;
        const { data: newComments } = await res.json() as { data: ResolvedComment[] };
        if (!newComments?.length) return;
        setComments((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const fresh = newComments.filter((c: ResolvedComment) => !existingIds.has(c.id));
          if (!fresh.length) return prev;
          latestTimestampRef.current = fresh[fresh.length - 1].created_at;
          return [...prev, ...fresh];
        });
      } catch { /* ignore */ }
    };
    const timer = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [feedbackId]);

  // Detect @mention while typing
  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setBody(val);

    const cursor = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursor);
    const mentionMatch = textBefore.match(/@([\w\s]*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionAnchor(cursor - mentionMatch[0].length);
    } else {
      setMentionQuery(null);
    }
  }

  const filteredMembers = mentionQuery !== null
    ? members.filter((m) => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

  function insertMention(member: OrgMember) {
    const before = body.slice(0, mentionAnchor);
    const after = body.slice(textareaRef.current?.selectionStart ?? mentionAnchor + (mentionQuery?.length ?? 0) + 1);
    const newBody = `${before}@${member.name} ${after}`;
    setBody(newBody);
    setMentionQuery(null);
    setTimeout(() => {
      textareaRef.current?.focus();
      const pos = mentionAnchor + member.name.length + 2;
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  }

  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    const start = ta?.selectionStart ?? body.length;
    const end = ta?.selectionEnd ?? body.length;
    const newBody = body.slice(0, start) + emoji + body.slice(end);
    setBody(newBody);
    setTimeout(() => {
      ta?.focus();
      const pos = start + emoji.length;
      ta?.setSelectionRange(pos, pos);
    }, 0);
  }

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    const supabase = createClient();
    const uploaded: string[] = [];

    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `comments/${feedbackId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('comment-attachments').upload(path, file, { upsert: false });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('comment-attachments').getPublicUrl(path);
        if (urlData?.publicUrl) uploaded.push(urlData.publicUrl);
      }
    }

    setAttachments((prev) => [...prev, ...uploaded]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [feedbackId]);

  function removeAttachment(url: string) {
    setAttachments((prev) => prev.filter((u) => u !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && !attachments.length) return;
    setLoading(true);
    setError('');

    if (isSupabaseConfigured()) {
      const fullBody = buildBody(body.trim(), attachments);
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback_id: feedbackId, body: fullBody, is_internal: isInternal }),
      });
      if (!res.ok) {
        setError('Failed to post comment. Please try again.');
        setLoading(false);
        return;
      }
      setBody('');
      setIsInternal(false);
      setAttachments([]);
      setMentionQuery(null);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-[#111111]">
        Comments {comments.length > 0 ? `(${comments.length})` : ''}
      </h2>

      {/* Comment list */}
      {comments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-400">
          No comments yet.
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => {
            const isMine = c.user_id === currentUserId;
            const cuMatch = c.body.match(CLICKUP_PREFIX);
            const isClickUp = !!cuMatch;
            const cuAuthor = cuMatch?.[1] ?? '';

            return (
              <div
                key={c.id}
                className={`rounded-2xl border p-4 ${
                  c.is_internal
                    ? 'bg-amber-50 border-amber-200'
                    : isMine
                    ? 'bg-[#fff9f8] border-[#ff724f]/20'
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isClickUp ? (
                      /* ClickUp avatar */
                      <div className="w-7 h-7 rounded-full bg-[#7b68ee] flex items-center justify-center font-bold text-white text-xs">
                        C
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#ff724f]/10 flex items-center justify-center text-[#ff724f] font-bold text-xs">
                        {(c.userName ?? '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-[#111111]">
                        {isClickUp ? 'ClickUp' : c.userName}
                        {isMine && !isClickUp && <span className="ml-1.5 text-[10px] text-[#ff724f] font-normal">(you)</span>}
                        {c.is_internal && (
                          <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Internal</span>
                        )}
                      </p>
                      {isClickUp ? (
                        /* Author badge under "ClickUp" name */
                        <span className="inline-flex items-center gap-1 bg-[#7b68ee]/10 text-[#7b68ee] text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5">
                          <svg width="9" height="9" viewBox="0 0 32 32" fill="none" className="shrink-0">
                            <path d="M4 22.4L8.3 18.7C10.7 21.4 13.2 22.7 16 22.7C18.8 22.7 21.2 21.4 23.6 18.7L28 22.3C24.6 26.2 20.6 28.3 16 28.3C11.4 28.3 7.4 26.2 4 22.4Z" fill="#8930FD"/>
                            <path d="M16 8.2L8.2 14.9L4.6 10.6L16 0.8L27.4 10.6L23.8 14.9L16 8.2Z" fill="#FF02F0"/>
                          </svg>
                          {cuAuthor} via ClickUp
                        </span>
                      ) : (
                        c.userEmail && <p className="text-[10px] text-gray-400">{c.userEmail}</p>
                      )}
                    </div>
                  </div>
                  <FormattedDate date={c.created_at} className="text-[10px] text-gray-400 shrink-0" />
                </div>
                <CommentBody body={c.body} />
              </div>
            );
          })}
        </div>
      )}

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Leave a comment
        </label>

        {/* Textarea + @mention dropdown */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleBodyChange}
            onKeyDown={(e) => {
              if (mentionQuery !== null && filteredMembers.length > 0 && e.key === 'Escape') {
                setMentionQuery(null);
              }
            }}
            placeholder="Write your comment here…"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all resize-none"
          />

          {/* @mention dropdown */}
          {mentionQuery !== null && filteredMembers.length > 0 && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-48 overflow-hidden">
              {filteredMembers.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#fff3f0] transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-[#ff724f]/10 flex items-center justify-center text-[#ff724f] font-bold text-xs shrink-0">
                    {m.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111111]">{m.name}</p>
                    <p className="text-[10px] text-gray-400">{m.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {attachments.map((url, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`attachment-${i}`} className="h-16 w-auto object-cover rounded-lg border border-gray-200" />
                <button
                  type="button"
                  onClick={() => removeAttachment(url)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}

        {/* Toolbar */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 relative">
            {/* Emoji button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmoji((v) => !v)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#ff724f] hover:bg-[#fff3f0] transition-colors text-lg"
                title="Emoji"
              >
                😊
              </button>
              {showEmoji && (
                <EmojiPicker
                  onSelect={insertEmoji}
                  onClose={() => setShowEmoji(false)}
                />
              )}
            </div>

            {/* @mention hint */}
            {members.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const ta = textareaRef.current;
                  const start = ta?.selectionStart ?? body.length;
                  const newBody = body.slice(0, start) + '@' + body.slice(start);
                  setBody(newBody);
                  setMentionQuery('');
                  setMentionAnchor(start);
                  setTimeout(() => {
                    ta?.focus();
                    ta?.setSelectionRange(start + 1, start + 1);
                  }, 0);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#ff724f] hover:bg-[#fff3f0] transition-colors text-sm font-bold"
                title="Mention someone"
              >
                @
              </button>
            )}

            {/* Image upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#ff724f] hover:bg-[#fff3f0] transition-colors disabled:opacity-50"
              title="Attach image"
            >
              {uploading
                ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-[18px]">image</span>
              }
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded"
              />
              Internal note
            </label>
            <button
              type="submit"
              disabled={loading || (!body.trim() && !attachments.length)}
              className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
