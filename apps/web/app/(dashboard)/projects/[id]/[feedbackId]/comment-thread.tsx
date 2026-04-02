'use client';

import { useState } from 'react';
import { isSupabaseConfigured } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';

// Matches "[via ClickUp · AuthorName]\ncomment text"
const CLICKUP_PREFIX = /^\[via ClickUp · (.+?)\]\n/;

function CommentBody({ body }: { body: string }) {
  const match = body.match(CLICKUP_PREFIX);
  if (match) {
    const author = match[1];
    const text = body.slice(match[0].length);
    return (
      <div className="text-sm text-gray-700 leading-relaxed">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="inline-flex items-center gap-1 bg-[#7b68ee]/10 text-[#7b68ee] text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <svg width="10" height="10" viewBox="0 0 32 32" fill="none" className="shrink-0">
              <path d="M4 22.4L8.3 18.7C10.7 21.4 13.2 22.7 16 22.7C18.8 22.7 21.2 21.4 23.6 18.7L28 22.3C24.6 26.2 20.6 28.3 16 28.3C11.4 28.3 7.4 26.2 4 22.4Z" fill="#8930FD"/>
              <path d="M16 8.2L8.2 14.9L4.6 10.6L16 0.8L27.4 10.6L23.8 14.9L16 8.2Z" fill="#FF02F0"/>
            </svg>
            {author} via ClickUp
          </span>
        </div>
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    );
  }
  return <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{body}</p>;
}

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
}

export function CommentThread({ feedbackId, initialComments, currentUserId }: Props) {
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError('');

    if (isSupabaseConfigured()) {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback_id: feedbackId, body: body.trim(), is_internal: isInternal }),
      });
      if (!res.ok) {
        setError('Failed to post comment. Please try again.');
        setLoading(false);
        return;
      }
      window.location.reload();
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-[#300a46]">
        Comments {initialComments.length > 0 ? `(${initialComments.length})` : ''}
      </h2>

      {initialComments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-400">
          No comments yet.
        </div>
      ) : (
        <div className="space-y-3">
          {initialComments.map((c) => {
            const isMine = c.user_id === currentUserId;
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
                    <div className="w-7 h-7 rounded-full bg-[#ff724f]/10 flex items-center justify-center text-[#ff724f] font-bold text-xs">
                      {(c.userName ?? '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#300a46]">
                        {c.userName}
                        {isMine && (
                          <span className="ml-1.5 text-[10px] text-[#ff724f] font-normal">(you)</span>
                        )}
                        {c.is_internal && (
                          <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Internal</span>
                        )}
                      </p>
                      {c.userEmail && (
                        <p className="text-[10px] text-gray-400">{c.userEmail}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">{formatDate(c.created_at)}</span>
                </div>
                <CommentBody body={c.body} />
              </div>
            );
          })}
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Leave a comment
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your comment here…"
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all resize-none"
        />
        {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
        <div className="flex items-center justify-between mt-3">
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
            disabled={loading || !body.trim()}
            className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
          >
            {loading ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      </form>
    </div>
  );
}
