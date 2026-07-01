'use client';

import { useState } from 'react';

interface Props {
  projectId: string;
  reporterEmail: string;
  reporterName: string;
}

export function ReporterInviteButton({ projectId, reporterEmail, reporterName }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleInvite() {
    setState('loading');
    try {
      const res = await fetch(`/api/projects/${projectId}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: reporterEmail, name: reporterName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setInviteUrl(data.data?.inviteUrl ?? '');
      setState('done');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (state === 'done' && inviteUrl) {
    return (
      <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-green-600 text-[15px]">check_circle</span>
          <p className="text-xs font-semibold text-green-800">Invite sent! Copy link to share:</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white border border-green-200 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-600 font-mono truncate">
            {inviteUrl}
          </div>
          <button
            onClick={copyLink}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg shrink-0 transition-all ${copied ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-white border border-green-200 text-green-700 hover:bg-green-100'}`}
          >
            <span className="material-symbols-outlined text-[13px]">{copied ? 'check' : 'content_copy'}</span>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-semibold mt-1">
        <span className="material-symbols-outlined text-[14px]">check_circle</span>
        Invited
      </span>
    );
  }

  return (
    <button
      onClick={handleInvite}
      disabled={state === 'loading'}
      className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
    >
      {state === 'loading' ? '…' : state === 'error' ? 'Failed' : 'Invite'}
    </button>
  );
}
