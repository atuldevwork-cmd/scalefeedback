'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { BulkActionsBar } from './bulk-actions';
import { FeedbackStatusBadge } from '@/components/feedback-status-badge';
import { FeedbackTypeBadge } from '@/components/feedback-type-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { FormattedDate } from '@/components/formatted-date';
import type { Feedback } from '@pinmarks/shared';

function ClickUpMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M3 14.4L5.9 12c1.5 1.8 3.1 2.7 4.8 2.7 1.7 0 3.3-.9 4.7-2.7l2.9 2.4C16.4 17 13.7 18.6 10.7 18.6c-3 0-5.7-1.6-7.7-4.2z" fill="currentColor"/>
      <path d="M10.7 5.4L5 10.3 3 8.1 10.7 1l7.7 7.1-2 2.2-5.7-4.9z" fill="currentColor"/>
    </svg>
  );
}

interface Props {
  feedback: Feedback[];
  projectId: string;
  screenshotBaseUrl?: string;
  userRole?: string | null;
  clickupConnected?: boolean;
}

export function FeedbackListClient({ feedback, projectId, screenshotBaseUrl, userRole, clickupConnected }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [pushingIds, setPushingIds] = useState<Set<string>>(new Set());
  const [pushedMap, setPushedMap] = useState<Map<string, string>>(new Map()); // feedbackId → taskUrl

  const canPushClickUp = clickupConnected && (userRole === 'owner' || userRole === 'admin');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    function handleClick() { setOpenMenuId(null); }
    if (openMenuId) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openMenuId]);

  async function pushToClickUp(feedbackId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPushingIds((prev) => new Set(prev).add(feedbackId));
    try {
      const res = await fetch('/api/clickup/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId }),
      });
      const data = await res.json() as { taskUrl?: string; error?: string };
      if (!res.ok) {
        toast(data.error ?? 'Failed to push to ClickUp', 'error');
      } else {
        setPushedMap((prev) => new Map(prev).set(feedbackId, data.taskUrl ?? ''));
        toast('Pushed to ClickUp successfully');
        router.refresh();
      }
    } catch {
      toast('Network error — could not push to ClickUp', 'error');
    } finally {
      setPushingIds((prev) => { const s = new Set(prev); s.delete(feedbackId); return s; });
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === feedback.length) setSelected(new Set());
    else setSelected(new Set(feedback.map((f) => f.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function confirmDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteId(id);
  }

  function doDelete() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    startDeleteTransition(async () => {
      await fetch(`/api/feedback/${id}`, { method: 'DELETE' });
      setConfirmDeleteId(null);
      toast('Feedback deleted');
      router.refresh();
    });
  }

  if (!feedback.length) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center bg-white">
        <span className="material-symbols-outlined text-gray-300 text-[40px] mb-3 block">inbox</span>
        <p className="text-gray-500 text-sm">No feedback matches your filters.</p>
      </div>
    );
  }

  const allChecked = selected.size === feedback.length && feedback.length > 0;
  const indeterminate = selected.size > 0 && selected.size < feedback.length;

  return (
    <>
      {/* Select-all row */}
      <div className={`flex items-center gap-3 mb-2 px-3 py-2 rounded-xl transition-colors ${selected.size > 0 ? 'bg-[#fff3f0]' : 'bg-transparent'}`}>
        <button
          onClick={toggleAll}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
            allChecked
              ? 'bg-[#ff724f] border-[#ff724f]'
              : indeterminate
              ? 'bg-[#ff724f] border-[#ff724f]'
              : 'border-gray-300 hover:border-[#ff724f]/60 bg-white'
          }`}
          aria-label="Select all"
        >
          {allChecked && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {indeterminate && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>
        <span className="text-xs font-medium text-gray-500">Select all</span>
        {selected.size > 0 && (
          <span className="text-xs font-semibold bg-[#ff724f] text-white px-2 py-0.5 rounded-full">
            {selected.size} selected
          </span>
        )}
      </div>

      <div className="space-y-2">
        {feedback.map((fb) => {
          const isSelected = selected.has(fb.id);
          return (
          <div
            key={fb.id}
            className={`group flex items-center gap-3 bg-white border rounded-xl p-4 transition-all ${
              isSelected
                ? 'border-[#ff724f]/40 bg-[#fff3f0]/40 shadow-sm'
                : 'border-gray-100 hover:shadow-card hover:border-gray-200'
            }`}
          >
            <button
              onClick={(e) => { e.stopPropagation(); toggle(fb.id); }}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                isSelected
                  ? 'bg-[#ff724f] border-[#ff724f]'
                  : 'border-gray-300 group-hover:border-[#ff724f]/50 bg-white'
              }`}
              aria-label="Select"
            >
              {isSelected && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <Link href={`/projects/${projectId}/${fb.id}`} className="flex items-center gap-4 flex-1 min-w-0 group/link">
              {/* Screenshot thumbnail */}
              <div className="w-16 h-12 rounded-lg bg-gray-50 border border-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
                {fb.screenshot_url && screenshotBaseUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${screenshotBaseUrl}/${fb.screenshot_url}`} alt="Screenshot" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-gray-300 text-[20px]">image</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <FeedbackTypeBadge type={fb.type} />
                  <PriorityBadge priority={fb.priority} />
                  {fb.custom_metadata?.source === 'ai-scan' && (() => {
                    const cat = fb.custom_metadata?.category as string | undefined;
                    const CATS: Record<string, { label: string; icon: string; cls: string }> = {
                      ux:            { label: 'UI / UX',       icon: '🎨', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
                      cro:           { label: 'CRO',           icon: '📈', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
                      accessibility: { label: 'Accessibility',  icon: '♿', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
                      seo:           { label: 'SEO',            icon: '🔍', cls: 'bg-green-100 text-green-700 border-green-200' },
                      technical:     { label: 'Technical',      icon: '⚙️', cls: 'bg-red-100 text-red-700 border-red-200' },
                      content:       { label: 'Content',        icon: '📝', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
                    };
                    const meta = cat ? CATS[cat] : null;
                    return (
                      <>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500/10 to-[#ff724f]/10 text-violet-600 border border-violet-200/60 shrink-0">
                          <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                          AI Scan
                        </span>
                        {meta && (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${meta.cls}`}>
                            {meta.icon} {meta.label}
                          </span>
                        )}
                      </>
                    );
                  })()}
                  <span className="text-sm font-medium text-[#111111] group-hover/link:text-[#ff724f] transition-colors truncate">
                    {fb.title ?? fb.page_url}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {fb.page_url}
                  {fb.custom_metadata?.source === 'ai-scan'
                    ? null
                    : fb.browser ? ` · ${fb.browser}` : ''}
                  {fb.os ? ` · ${fb.os}` : ''}
                </p>
              </div>

              {/* Meta — status badge, ClickUp indicator (if pushed), date */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                {(fb.external_id || pushedMap.has(fb.id)) && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#7B68EE]">
                    <ClickUpMark />
                    In ClickUp
                  </span>
                )}
                <FeedbackStatusBadge status={fb.status} />
                <FormattedDate date={fb.created_at} className="text-xs text-gray-400" />
              </div>
            </Link>

            {/* ··· row menu */}
            <div className="relative shrink-0">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(openMenuId === fb.id ? null : fb.id); }}
                title="More actions"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>

              {openMenuId === fb.id && (
                <div
                  onClick={(e) => e.stopPropagation()} 
                  className="absolute right-0 top-full mt-1 z-50 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-[14px]"
                >
                  {/* More details */}
                  <Link
                    href={`/projects/${projectId}/${fb.id}`}
                    onClick={() => setOpenMenuId(null)}
                    className="flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    More details
                  </Link>

                  {/* Open ClickUp task */}
                  {(fb.external_url || pushedMap.get(fb.id)) ? (
                    <a
                      href={fb.external_url ?? pushedMap.get(fb.id) ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpenMenuId(null)}
                      className="flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      <ClickUpMark />
                      Open ClickUp task
                    </a>
                  ) : canPushClickUp ? (
                    <button
                      onClick={(e) => { setOpenMenuId(null); pushToClickUp(fb.id, e); }}
                      disabled={pushingIds.has(fb.id)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {pushingIds.has(fb.id)
                        ? <span className="w-3.5 h-3.5 border border-[#7B68EE] border-t-transparent rounded-full animate-spin" />
                        : <ClickUpMark />}
                      {pushingIds.has(fb.id) ? 'Pushing…' : 'Push to ClickUp'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-2.5 px-3 py-2 text-gray-300 cursor-not-allowed select-none">
                      <ClickUpMark />
                      Open ClickUp task
                    </span>
                  )}

                  {/* Copy issue link */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      navigator.clipboard.writeText(`${window.location.origin}/projects/${projectId}/${fb.id}`);
                      toast('Link copied');
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                    </svg>
                    Copy issue link
                  </button>

                  <div className="my-1 border-t border-gray-100" />

                  {/* Delete */}
                  <button
                    onClick={(e) => { setOpenMenuId(null); confirmDelete(fb.id, e); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-red-500 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete feedback
                  </button>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      <BulkActionsBar
        feedbackIds={Array.from(selected)}
        onDone={clearSelection}
      />

      {/* Delete confirm modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-500 text-[24px]">delete</span>
            </div>
            <div className="text-center">
              <p className="font-semibold text-[#111111] text-lg">Delete feedback?</p>
              <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
