'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { FeedbackStatus } from '@pinmarks/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statuses: { value: FeedbackStatus; label: string; dot: string }[] = [
  { value: 'open',        label: 'Open',        dot: 'bg-blue-500' },
  { value: 'in_progress', label: 'In Progress',  dot: 'bg-yellow-500' },
  { value: 'resolved',    label: 'Resolved',     dot: 'bg-green-500' },
  { value: 'closed',      label: 'Closed',       dot: 'bg-gray-400' },
  { value: 'wont_fix',    label: "Won't Fix",    dot: 'bg-red-500' },
];

interface Props {
  feedbackId: string;
  currentStatus: FeedbackStatus;
}

export function UpdateStatusSelect({ feedbackId, currentStatus }: Props) {
  const [status, setStatus] = useState<FeedbackStatus>(currentStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleChange(newStatus: FeedbackStatus) {
    setLoading(true);
    setStatus(newStatus);
    await supabase.from('feedback').update({ status: newStatus }).eq('id', feedbackId);
    setLoading(false);
    router.refresh();
  }

  const current = statuses.find((s) => s.value === status);

  return (
    <Select value={status} onValueChange={(v) => handleChange(v as FeedbackStatus)} disabled={loading}>
      <SelectTrigger className="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm text-[#111111] hover:border-[#ff724f]/40 hover:bg-gray-50 focus:ring-2 focus:ring-[#ff724f]/20 focus:border-[#ff724f]/50 disabled:opacity-60 transition-colors">
        <div className="flex items-center gap-2">
          {current && <span className={`w-2 h-2 rounded-full shrink-0 ${current.dot}`} />}
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl p-1">
        {statuses.map((s) => (
          <SelectItem
            key={s.value}
            value={s.value}
            className="rounded-lg px-3 py-2 text-sm text-[#111111] cursor-pointer focus:bg-[#fff3f0] focus:text-[#ff724f] data-[state=checked]:text-[#ff724f] data-[state=checked]:font-semibold"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
              {s.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
