'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Props {
  feedbackId: string;
  projectId: string;
  clickupTaskUrl?: string | null;
}

export function FeedbackActionsMenu({ feedbackId, projectId, clickupTaskUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setOpen(false);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm('Delete this feedback? This cannot be undone.')) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from('feedback').delete().eq('id', feedbackId);
    router.push(`/projects/${projectId}`);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
          open ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
      >
        <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="8" cy="2.5" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="8" cy="13.5" r="1.4" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-50 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 origin-top-left animate-in fade-in zoom-in-95 duration-100">
          {clickupTaskUrl ? (
            <a
              href={clickupTaskUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open ClickUp task
            </a>
          ) : (
            <span className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-300 cursor-not-allowed select-none">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open ClickUp task
            </span>
          )}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {copied ? 'Copied!' : 'Copy issue link'}
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {deleting ? 'Deleting…' : 'Delete feedback'}
          </button>
        </div>
      )}
    </div>
  );
}
