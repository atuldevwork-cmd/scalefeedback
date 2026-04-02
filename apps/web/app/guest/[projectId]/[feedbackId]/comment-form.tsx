'use client';

import { useState } from 'react';

export function GuestCommentForm({ feedbackId }: { feedbackId: string }) {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/guest/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback_id: feedbackId, body: body.trim() }),
    });

    if (res.ok) {
      setSubmitted(true);
      setBody('');
      // Refresh page to show new comment
      window.location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Failed to post comment. Please try again.');
      setLoading(false);
    }
  }

  if (submitted) return null;

  return (
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
      {error && (
        <p className="text-xs text-red-600 mt-1.5">{error}</p>
      )}
      <div className="flex justify-end mt-3">
        <button
          type="submit"
          disabled={loading || !body.trim()}
          className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
        >
          {loading ? 'Posting…' : 'Post comment'}
        </button>
      </div>
    </form>
  );
}
