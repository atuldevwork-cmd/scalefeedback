'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  dot?: string;
  textColor?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  icon,
  triggerClassName,
  disabled,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm text-[#300a46] hover:border-[#ff724f]/40 hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap',
          open && 'border-[#ff724f]/50 ring-2 ring-[#ff724f]/20',
          triggerClassName
        )}
      >
        {icon && <span className="material-symbols-outlined text-[15px] text-gray-400">{icon}</span>}
        {selected?.dot && <span className={`w-2 h-2 rounded-full shrink-0 ${selected.dot}`} />}
        <span className={selected?.textColor ?? 'text-[#300a46]'}>
          {selected ? selected.label : (placeholder ?? 'Select')}
        </span>
        <span className="material-symbols-outlined text-[16px] text-gray-400 ml-1">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[160px] bg-white border border-gray-100 rounded-xl shadow-xl p-1">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                  isSelected
                    ? 'bg-[#fff3f0] text-[#ff724f] font-semibold'
                    : 'text-[#300a46] hover:bg-gray-50'
                )}
              >
                {opt.dot && <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />}
                <span className={opt.textColor}>{opt.label}</span>
                {isSelected && <span className="material-symbols-outlined text-[14px] text-[#ff724f] ml-auto">check</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
