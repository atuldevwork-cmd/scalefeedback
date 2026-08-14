'use client';

import { useState } from 'react';

export interface TocItem {
  id: string;
  label: string;
}

export function ArticleTOC({ items }: { items: TocItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-14 z-[5] max-w-[650px] bg-background border border-border rounded-xl mb-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
      >
        Table of contents
        <span className={`material-symbols-outlined text-[18px] transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      {open && (
        <nav className="border-t border-border px-4 py-2">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setOpen(false)}
              className="block py-1.5 text-sm text-muted-foreground hover:text-[#ff724f] transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
