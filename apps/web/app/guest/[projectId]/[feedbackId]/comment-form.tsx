'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const ATTACHMENT_MARKER = '__attachments__:';

const EMOJI_GROUPS = [
  { label: 'Smileys', emojis: ['😀','😄','😊','😍','🤔','😅','😂','🤣','😭','😢','😡','🤯','🥳','😎','🤩','🥺','😴','🤫','🤗','😬'] },
  { label: 'Gestures', emojis: ['👍','👎','👏','🙌','🤝','🙏','✌️','🤞','💪','👀','✅','❌','⚠️','🔥','💡','🚀','⭐','💯','❓','‼️'] },
  { label: 'Objects', emojis: ['🐛','🔗','📎','📌','🗂️','📋','✏️','🖊️','🔍','🔧','🔨','📱','💻','🖥️','📷','🎨','📝','📊','📈','🗓️'] },
];

function buildBody(text: string, attachments: string[]): string {
  if (!attachments.length) return text;
  return `${text}\n${ATTACHMENT_MARKER}${JSON.stringify(attachments)}`;
}

interface Member { user_id: string; email: string; name: string; }

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

export function GuestCommentForm({ feedbackId, members = [] }: { feedbackId: string; members?: Member[] }) {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Emoji
  const [showEmoji, setShowEmoji] = useState(false);

  // @mention
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState(0);

  // Attachments
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMembers = mentionQuery !== null
    ? members.filter((m) => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

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

  function insertMention(member: Member) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && !attachments.length) return;
    setLoading(true);
    setError('');

    const fullBody = buildBody(body.trim(), attachments);
    const res = await fetch('/api/guest/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback_id: feedbackId, body: fullBody }),
    });

    if (res.ok) {
      window.location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Failed to post comment. Please try again.');
      setLoading(false);
    }
  }

  return (
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
            if (mentionQuery !== null && e.key === 'Escape') setMentionQuery(null);
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
                  <p className="text-sm font-medium text-[#300a46]">{m.name}</p>
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
                onClick={() => setAttachments((prev) => prev.filter((u) => u !== url))}
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
          {/* Emoji */}
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
              <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
            )}
          </div>

          {/* @mention */}
          {members.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const ta = textareaRef.current;
                const start = ta?.selectionStart ?? body.length;
                setBody(body.slice(0, start) + '@' + body.slice(start));
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

        <button
          type="submit"
          disabled={loading || (!body.trim() && !attachments.length)}
          className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
        >
          {loading ? 'Posting…' : 'Post comment'}
        </button>
      </div>
    </form>
  );
}
