'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDate } from '@/lib/utils';

interface Guest {
  id: string;
  email: string;
  name: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export function GuestsPanel({ projectId }: { projectId: string }) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [secretLink, setSecretLink] = useState('');
  const [secretCopied, setSecretCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadGuests = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/guests`);
    if (res.ok) {
      const { data } = await res.json();
      setGuests(data ?? []);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadGuests(); }, [loadGuests]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/guest-link`)
      .then((r) => r.json())
      .then(({ url }) => { if (url) setSecretLink(url); });
  }, [projectId]);

  function copySecretLink() {
    navigator.clipboard.writeText(secretLink);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  }

  async function regenerateLink() {
    setRegenerating(true);
    const res = await fetch(`/api/projects/${projectId}/guest-link`, { method: 'POST' });
    const { url } = await res.json();
    if (url) setSecretLink(url);
    setRegenerating(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to invite guest');
      setInviteUrl(data.data?.inviteUrl ?? '');
      setEmail('');
      setName('');
      setShowForm(false);
      loadGuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(guestId: string) {
    setRemovingId(guestId);
    await fetch(`/api/projects/${projectId}/guests/${guestId}`, { method: 'DELETE' });
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
    setRemovingId(null);
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <div>
      {/* Secret invite link */}
      <div className="bg-[#fff3f0]/60 border border-[#ff724f]/20 rounded-2xl p-5 mb-5">
        <div className="flex items-start gap-3 mb-3">
          <span className="material-symbols-outlined text-[#ff724f] text-[20px] mt-0.5">link</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#300a46]">Secret invite link</p>
            <p className="text-xs text-gray-500 mt-0.5">Anyone with this link can sign in and get read-only access to this project.</p>
          </div>
          <button
            onClick={regenerateLink}
            disabled={regenerating}
            title="Regenerate link (invalidates old one)"
            className="text-xs text-gray-400 hover:text-[#ff724f] transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
          >
            <span className={`material-symbols-outlined text-[16px] ${regenerating ? 'animate-spin' : ''}`}>refresh</span>
            Reset
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 font-mono truncate">
            {secretLink || 'Loading…'}
          </div>
          <button
            onClick={copySecretLink}
            disabled={!secretLink}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl shrink-0 transition-all ${secretCopied ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <span className="material-symbols-outlined text-[14px]">{secretCopied ? 'check' : 'content_copy'}</span>
            {secretCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">
            Or invite a specific person by email below.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setInviteUrl(''); setError(''); }}
          className="flex items-center gap-2 bg-[#ff724f] hover:bg-[#e8603a] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">person_add</span>
          Invite guest
        </button>
      </div>

      {/* Invite form */}
      {showForm && (
        <div className="bg-[#fff3f0]/50 border border-[#ff724f]/20 rounded-xl p-4 mb-4">
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@company.com"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Client name"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] bg-white transition-all"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="bg-[#ff724f] hover:bg-[#e8603a] text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-60 transition-all shadow-sm">
                {submitting ? 'Inviting…' : 'Send invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invite link after sending */}
      {inviteUrl && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
            <p className="text-sm font-semibold text-green-800">Guest invited! Share this link:</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white border border-green-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 font-mono truncate">
              {inviteUrl}
            </div>
            <button onClick={copyLink}
              className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-all ${linkCopied ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-white border border-green-200 text-green-700 hover:bg-green-100'}`}>
              <span className="material-symbols-outlined text-[13px]">{linkCopied ? 'check' : 'content_copy'}</span>
              {linkCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Guest list */}
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
      ) : guests.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-gray-200 rounded-xl">
          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-gray-400 text-[20px]">group</span>
          </div>
          <p className="text-sm text-gray-500">No guests yet.</p>
          <p className="text-xs text-gray-400 mt-1">Invite clients to view this project&apos;s feedback.</p>
        </div>
      ) : (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Guest</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Expires</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {guests.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#fff3f0] flex items-center justify-center text-xs font-bold text-[#ff724f] shrink-0">
                        {(g.name || g.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        {g.name && <div className="text-xs font-medium text-gray-800">{g.name}</div>}
                        <div className="text-xs text-gray-500">{g.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {g.accepted_at ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Accepted</span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(g.expires_at)}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => handleRemove(g.id)}
                      disabled={removingId === g.id}
                      className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {removingId === g.id ? '…' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
