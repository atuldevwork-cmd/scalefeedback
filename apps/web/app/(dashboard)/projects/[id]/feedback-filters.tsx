'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { CustomSelect } from '@/components/ui/custom-select';

const TYPE_OPTIONS = [
  { value: '__all__', label: 'All types' },
  { value: 'bug',        label: 'Bug',        dot: 'bg-red-400' },
  { value: 'suggestion', label: 'Suggestion', dot: 'bg-purple-400' },
  { value: 'question',   label: 'Question',   dot: 'bg-blue-400' },
  { value: 'other',      label: 'Other',      dot: 'bg-gray-400' },
];

const PRIORITY_OPTIONS = [
  { value: '__all__',  label: 'All priorities' },
  { value: 'critical', label: 'Critical', dot: 'bg-red-500',    textColor: 'text-red-700' },
  { value: 'high',     label: 'High',     dot: 'bg-orange-500', textColor: 'text-orange-600' },
  { value: 'medium',   label: 'Medium',   dot: 'bg-blue-500',   textColor: 'text-blue-700' },
  { value: 'low',      label: 'Low',      dot: 'bg-gray-400',   textColor: 'text-gray-600' },
];

const RANGE_OPTIONS = [
  { value: '__all__', label: 'Any time' },
  { value: 'today',   label: 'Today' },
  { value: 'week',    label: 'This week' },
  { value: 'month',   label: 'This month' },
];

export function FeedbackFilters({ projectId: _projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const get = (key: string) => searchParams.get(key) ?? '';

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== '__all__') params.set(key, value);
    else params.delete(key);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }, [pathname, router, searchParams]);

  const hasFilters = get('q') || get('type') || get('priority') || get('range');

  return (
    <div className="flex items-center gap-2.5 mb-6 p-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-gray-400">search</span>
        <input
          type="text"
          placeholder="Search feedback…"
          defaultValue={get('q')}
          onChange={(e) => update('q', e.target.value)}
          className="w-full pl-9 pr-3 h-9 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff724f]/20 focus:border-[#ff724f]/50 bg-white text-[#111111] placeholder:text-gray-400 transition-colors"
        />
      </div>

      <CustomSelect
        value={get('type') || '__all__'}
        onChange={(v) => update('type', v)}
        options={TYPE_OPTIONS}
        icon="label"
      />

      <CustomSelect
        value={get('priority') || '__all__'}
        onChange={(v) => update('priority', v)}
        options={PRIORITY_OPTIONS}
        icon="flag"
      />

      <CustomSelect
        value={get('range') || '__all__'}
        onChange={(v) => update('range', v)}
        options={RANGE_OPTIONS}
        icon="calendar_today"
      />

      {hasFilters && (
        <button
          onClick={() => router.replace(pathname)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#ff724f] transition-colors px-2 py-1 rounded-lg hover:bg-[#fff3f0]"
        >
          <span className="material-symbols-outlined text-[14px]">close</span>
          Clear
        </button>
      )}
    </div>
  );
}
