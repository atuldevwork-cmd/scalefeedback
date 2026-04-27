'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { BulkActionsBar } from './bulk-actions';
import { FeedbackStatusBadge } from '@/components/feedback-status-badge';
import { FeedbackTypeBadge } from '@/components/feedback-type-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { FormattedDate } from '@/components/formatted-date';
import type { Feedback } from '@scalefeedback/shared';

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
                  {fb.custom_metadata?.source === 'ai-scan' && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500/10 to-[#ff724f]/10 text-violet-600 border border-violet-200/60 shrink-0">
                      <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                      AI
                    </span>
                  )}
                  {fb.custom_metadata?.source === 'ai-scan' && fb.custom_metadata?.category === 'ux' && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 shrink-0">
                      🎨 UI / UX
                    </span>
                  )}
                  {fb.custom_metadata?.source === 'ai-scan' && fb.custom_metadata?.category === 'accessibility' && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                      ♿ Accessibility
                    </span>
                  )}
                  {fb.custom_metadata?.source === 'ai-scan' && fb.custom_metadata?.category === 'seo' && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 shrink-0">
                      🔍 SEO
                    </span>
                  )}
                  {fb.custom_metadata?.source === 'ai-scan' && fb.custom_metadata?.category === 'technical' && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 shrink-0">
                      ⚙️ Technical
                    </span>
                  )}
                  {fb.custom_metadata?.source === 'ai-scan' && fb.custom_metadata?.category === 'content' && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                      📝 Content
                    </span>
                  )}
                  <span className="text-sm font-medium text-[#300a46] group-hover/link:text-[#ff724f] transition-colors truncate">
                    {fb.title ?? fb.page_url}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {fb.page_url}{fb.browser ? ` · ${fb.browser}` : ''}{fb.os ? ` · ${fb.os}` : ''}
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

            {/* Push to ClickUp — only for unpushed AI-scan issues, owners/admins, on hover */}
            {canPushClickUp && fb.custom_metadata?.source === 'ai-scan' &&
             !fb.external_id && !pushedMap.has(fb.id) && (
              <button
                onClick={(e) => pushToClickUp(fb.id, e)}
                disabled={pushingIds.has(fb.id)}
                title="Push to ClickUp"
                className="hidden group-hover:flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold border border-[#7B68EE]/30 text-[#7B68EE] hover:bg-[#7B68EE]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {pushingIds.has(fb.id) ? (
                  <span className="w-3 h-3 border border-[#7B68EE] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ClickUpMark />
                )}
                {pushingIds.has(fb.id) ? 'Pushing…' : 'Push'}
              </button>
            )}

            {/* Delete button — visible on row hover */}
            <button
              onClick={(e) => confirmDelete(fb.id, e)}
              title="Delete"
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
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
              <p className="font-semibold text-[#300a46] text-lg">Delete feedback?</p>
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
