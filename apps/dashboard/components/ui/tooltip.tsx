'use client';

import { useId } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
  align?: 'center' | 'start';
}

export function Tooltip({ content, children, side = 'bottom', align = 'center' }: TooltipProps) {
  const id = useId();

  return (
    <span className="relative inline-flex group/tooltip">
      <span aria-describedby={id} className="contents">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={[
          'pointer-events-none absolute z-50 w-60',
          side === 'bottom' ? 'top-full mt-2.5' : 'bottom-full mb-2.5',
          align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0',
          'opacity-0 scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:scale-100',
          'transition-all duration-150 ease-out',
          side === 'bottom' ? 'origin-top' : 'origin-bottom',
        ].join(' ')}
      >
        <span className="block bg-[#111111] text-white text-xs leading-relaxed rounded-xl px-3.5 py-2.5 shadow-xl">
          {content}
        </span>
        <span
          aria-hidden
          className={[
            'absolute w-2.5 h-2.5 bg-[#111111] rotate-45',
            align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-4',
            side === 'bottom' ? '-top-1' : '-bottom-1',
          ].join(' ')}
        />
      </span>
    </span>
  );
}
