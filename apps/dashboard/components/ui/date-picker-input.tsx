'use client';

import { useEffect, useRef, useState } from 'react';
import flatpickr from 'flatpickr';
import type { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';
import 'flatpickr/dist/flatpickr.css';

interface Props {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Deliberately a single input with no altInput: flatpickr's altInput mode
// inserts a second, React-invisible DOM node it manages itself — under
// React's re-render/remount cycles (StrictMode double-invoke, a parent
// router.refresh(), etc.) that extra node is prone to being duplicated
// rather than reconciled, since React only ever knows about the one input
// it rendered. A single node keeps flatpickr's DOM footprint identical to
// what React expects, so the destroy-before-create guard below is enough.
export function DatePickerInput({ value, onChange, placeholder, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<FlatpickrInstance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [hasValue, setHasValue] = useState(!!value);

  useEffect(() => {
    if (!inputRef.current) return;

    // Defensive guard: React (StrictMode double-invoke in dev, fast refresh,
    // a parent router.refresh(), etc.) can run this effect's setup again
    // without the previous instance's cleanup having applied first yet.
    // flatpickr doesn't dedupe on its own, so destroy any instance already
    // attached to this element before creating a new one.
    const existing = (inputRef.current as unknown as { _flatpickr?: FlatpickrInstance })._flatpickr;
    existing?.destroy();

    fpRef.current = flatpickr(inputRef.current, {
      dateFormat: 'M j, Y',
      defaultDate: value || undefined,
      onChange: (_dates, _dateStr, instance) => {
        const iso = instance.input.value ? instance.formatDate(instance.selectedDates[0], 'Y-m-d') : '';
        onChangeRef.current(iso);
        setHasValue(!!iso);
      },
    });
    return () => { fpRef.current?.destroy(); fpRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fpRef.current) return;
    const currentIso = fpRef.current.selectedDates[0] ? fpRef.current.formatDate(fpRef.current.selectedDates[0], 'Y-m-d') : '';
    if (currentIso !== value) {
      fpRef.current.setDate(value || '', false);
      setHasValue(!!value);
    }
  }, [value]);

  function handleClear() {
    fpRef.current?.clear();
    onChangeRef.current('');
    setHasValue(false);
  }

  return (
    <div className="relative">
      <input ref={inputRef} type="text" placeholder={placeholder} className={className} readOnly />
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear date"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
}
