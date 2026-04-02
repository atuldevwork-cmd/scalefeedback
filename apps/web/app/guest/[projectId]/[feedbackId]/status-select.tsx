'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

const STATUSES = [
  { value: 'open',        label: 'Open',        dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700' },
  { value: 'in_progress', label: 'In Progress',  dot: 'bg-yellow-500', badge: 'bg-yellow-50 text-yellow-700' },
  { value: 'resolved',    label: 'Resolved',     dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700' },
  { value: 'closed',      label: 'Closed',       dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-500' },
  { value: 'wont_fix',    label: "Won't Fix",    dot: 'bg-red-500',    badge: 'bg-red-50 text-red-600' },
];

export function GuestStatusSelect({ feedbackId, currentStatus }: { feedbackId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  const current = STATUSES.find((s) => s.value === status) ?? STATUSES[0];

  async function handleChange(newStatus: string) {
    if (newStatus === status) return;
    setSaving(true);
    const res = await fetch('/api/guest/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback_id: feedbackId, status: newStatus }),
    });
    if (res.ok) setStatus(newStatus);
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="h-8 rounded-xl border border-gray-200 bg-white px-2.5 text-xs text-[#300a46] hover:border-[#ff724f]/40 hover:bg-gray-50 focus:ring-2 focus:ring-[#ff724f]/20 disabled:opacity-50 transition-colors min-w-[120px]">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${current.dot}`} />
            <span className={`font-semibold text-xs px-1.5 py-0.5 rounded-full ${current.badge}`}>
              {current.label}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl p-1">
          {STATUSES.map((s) => (
            <SelectItem
              key={s.value}
              value={s.value}
              className="rounded-lg px-3 py-2 text-sm cursor-pointer focus:bg-[#fff3f0] data-[state=checked]:font-semibold"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving && <span className="text-[10px] text-gray-400">Saving…</span>}
    </div>
  );
}
