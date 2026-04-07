'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { BulkActionsBar } from './bulk-actions';
import { FeedbackStatusBadge } from '@/components/feedback-status-badge';
import { FeedbackTypeBadge } from '@/components/feedback-type-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { formatDate } from '@/lib/utils';
import type { Feedback } from '@scalefeedback/shared';

interface Props {
  feedback: Feedback[];
  projectId: string;
  screenshotBaseUrl?: string;
}

export function FeedbackListClient({ feedback, projectId, screenshotBaseUrl }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

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
    setConfirmDeleteId(null);
    startDeleteTransition(async () => {
      await fetch(`/api/feedback/${id}`, { method: 'DELETE' });
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
                  <span className="text-sm font-medium text-[#300a46] group-hover/link:text-[#ff724f] transition-colors truncate">
                    {fb.title ?? fb.page_url}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {fb.page_url}{fb.browser ? ` · ${fb.browser}` : ''}{fb.os ? ` · ${fb.os}` : ''}
                </p>
              </div>

              {/* Meta */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <FeedbackStatusBadge status={fb.status} />
                <span className="text-xs text-gray-400">{formatDate(fb.created_at)}</span>
              </div>
            </Link>

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
