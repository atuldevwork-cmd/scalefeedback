'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/mock-data';
import type { FeedbackPriority } from '@scalefeedback/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const priorities: { value: FeedbackPriority; label: string; dot: string; text: string }[] = [
  { value: 'low',      label: 'Low',      dot: 'bg-gray-400',   text: 'text-gray-600' },
  { value: 'medium',   label: 'Medium',   dot: 'bg-blue-500',   text: 'text-blue-700' },
  { value: 'high',     label: 'High',     dot: 'bg-orange-500', text: 'text-orange-600' },
  { value: 'critical', label: 'Critical', dot: 'bg-red-500',    text: 'text-red-700' },
];

export function UpdatePrioritySelect({ feedbackId, currentPriority }: { feedbackId: string; currentPriority: FeedbackPriority }) {
  const [priority, setPriority] = useState<FeedbackPriority>(currentPriority);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleChange(newPriority: FeedbackPriority) {
    setPriority(newPriority);
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from('feedback').update({ priority: newPriority }).eq('id', feedbackId);
    setLoading(false);
    router.refresh();
  }

  const current = priorities.find((p) => p.value === priority);

  return (
    <Select value={priority} onValueChange={(v) => handleChange(v as FeedbackPriority)} disabled={loading}>
      <SelectTrigger className="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm text-[#300a46] hover:border-[#ff724f]/40 hover:bg-gray-50 focus:ring-2 focus:ring-[#ff724f]/20 focus:border-[#ff724f]/50 disabled:opacity-60 transition-colors">
        <div className={`flex items-center gap-2 font-medium ${current?.text ?? ''}`}>
          {current && <span className={`w-2 h-2 rounded-full shrink-0 ${current.dot}`} />}
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl p-1">
        {priorities.map((p) => (
          <SelectItem
            key={p.value}
            value={p.value}
            className="rounded-lg px-3 py-2 text-sm cursor-pointer focus:bg-[#fff3f0] data-[state=checked]:font-semibold"
          >
            <div className={`flex items-center gap-2 ${p.text}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />
              {p.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
