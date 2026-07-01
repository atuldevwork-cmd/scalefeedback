'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/mock-data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

interface Member {
  user_id: string;
  email: string;
  name: string;
}

const MOCK_MEMBERS: Member[] = [
  { user_id: 'u-1', email: 'atul@scalestation.io', name: 'Atul Singh' },
  { user_id: 'u-2', email: 'dev@scalestation.io', name: 'Dev Team' },
];

interface Props {
  feedbackId: string;
  currentAssignee: string | null;
  members: Member[];
}

export function AssignSelect({ feedbackId, currentAssignee, members }: Props) {
  const [assignee, setAssignee] = useState<string>(currentAssignee ?? '');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleChange(userId: string) {
    setAssignee(userId);
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from('feedback').update({ assigned_to: userId || null }).eq('id', feedbackId);
    setLoading(false);
    router.refresh();
  }

  const list = members.length ? members : MOCK_MEMBERS;
  const selected = list.find((m) => m.user_id === assignee);

  return (
    <Select value={assignee || '__unassigned__'} onValueChange={(v) => handleChange(v === '__unassigned__' ? '' : v)} disabled={loading}>
      <SelectTrigger className="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm text-[#111111] hover:border-[#ff724f]/40 hover:bg-gray-50 focus:ring-2 focus:ring-[#ff724f]/20 focus:border-[#ff724f]/50 disabled:opacity-60 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <div className="w-5 h-5 rounded-full bg-[#fff3f0] flex items-center justify-center text-[10px] font-bold text-[#ff724f] shrink-0">
                {selected.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[12px] text-gray-400">person</span>
              </div>
              <span className="text-gray-400">Unassigned</span>
            </>
          )}
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl p-1">
        <SelectItem
          value="__unassigned__"
          className="rounded-lg px-3 py-2 text-sm text-gray-400 cursor-pointer focus:bg-[#fff3f0] focus:text-[#ff724f] data-[state=checked]:text-[#ff724f] data-[state=checked]:font-semibold"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[12px] text-gray-400">person</span>
            </div>
            Unassigned
          </div>
        </SelectItem>
        {list.map((m) => (
          <SelectItem
            key={m.user_id}
            value={m.user_id}
            className="rounded-lg px-3 py-2 text-sm text-[#111111] cursor-pointer focus:bg-[#fff3f0] focus:text-[#ff724f] data-[state=checked]:text-[#ff724f] data-[state=checked]:font-semibold"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#fff3f0] flex items-center justify-center text-[10px] font-bold text-[#ff724f] shrink-0">
                {m.name.charAt(0).toUpperCase()}
              </div>
              {m.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
