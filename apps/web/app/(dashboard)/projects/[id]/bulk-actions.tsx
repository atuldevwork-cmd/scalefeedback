'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  feedbackIds: string[];
  onDone: () => void;
}

const STATUSES = [
  { value: 'open',        label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved',    label: 'Resolved' },
  { value: 'closed',      label: 'Closed' },
  { value: 'wont_fix',    label: "Won't Fix" },
];

export function BulkActionsBar({ feedbackIds, onDone }: Props) {
  const toast = useToast();
  const router = useRouter();
  const count = feedbackIds.length;
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [status, setStatus] = useState('resolved');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (count === 0) return null;

  async function applyStatus() {
    startTransition(async () => {
      await Promise.all(
        feedbackIds.map((id) =>
          fetch(`/api/feedback/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          })
        )
      );
      toast(`${count} item${count > 1 ? 's' : ''} updated to ${status.replace('_', ' ')}`);
      onDone();
    });
  }

  function bulkDelete() {
    setConfirmDelete(false);
    startDeleteTransition(async () => {
      await Promise.all(
        feedbackIds.map((id) => fetch(`/api/feedback/${id}`, { method: 'DELETE' }))
      );
      toast(`${count} item${count > 1 ? 's' : ''} deleted`);
      onDone();
      router.refresh();
    });
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#1a0a2e] text-white pl-3 pr-2 py-2 rounded-2xl shadow-2xl border border-white/10">
        {/* Count badge */}
        <span className="text-xs font-bold bg-[#ff724f] text-white px-2.5 py-1 rounded-lg shrink-0">
          {count}
        </span>
        <span className="text-sm text-white/70 pr-1">selected</span>

        <div className="w-px h-5 bg-white/15 mx-1" />

        {/* Status selector */}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 rounded-lg border border-white/15 bg-white/10 text-white text-sm px-3 hover:bg-white/20 focus:ring-1 focus:ring-white/30 min-w-[130px] transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl p-1">
            {STATUSES.map((s) => (
              <SelectItem
                key={s.value}
                value={s.value}
                className="rounded-lg px-3 py-2 text-sm text-[#111111] cursor-pointer focus:bg-[#fff3f0] focus:text-[#ff724f] data-[state=checked]:text-[#ff724f] data-[state=checked]:font-semibold"
              >
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          onClick={applyStatus}
          disabled={isPending || isDeleting}
          className="bg-[#ff724f] hover:bg-[#e8603a] text-white text-sm font-semibold px-4 py-1.5 rounded-lg disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Applying…' : 'Apply'}
        </button>

        <div className="w-px h-5 bg-white/15 mx-1" />

        <button
          onClick={() => setConfirmDelete(true)}
          disabled={isPending || isDeleting}
          className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm font-medium transition-colors disabled:opacity-60 px-1"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>

        <button
          onClick={onDone}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title="Cancel"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>

      {/* Bulk delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-500 text-[24px]">delete</span>
            </div>
            <div className="text-center">
              <p className="font-semibold text-[#111111] text-lg">Delete {count} item{count > 1 ? 's' : ''}?</p>
              <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={bulkDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
