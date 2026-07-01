'use client';

import { useEffect, useRef, useState } from 'react';

interface NavItem {
  id: string;
  label: string;
}

interface Props {
  items: NavItem[];
}

function getMain(): HTMLElement | null {
  return document.querySelector('main');
}

export function SettingsNav({ items }: Props) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '');
  const [stuck, setStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Detect sticky state relative to the main scroll container
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = getMain();
    if (!sentinel || !container) return;

    const obs = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { root: container, threshold: 0 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  // Highlight active section based on scroll position inside main
  useEffect(() => {
    const container = getMain();
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { root: container, rootMargin: '-10% 0px -75% 0px' }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    const container = getMain();
    if (!el || !container) return;

    const elTop = el.getBoundingClientRect().top;
    const containerTop = container.getBoundingClientRect().top;
    const target = container.scrollTop + (elTop - containerTop) - 56 - 12;
    container.scrollTo({ top: target, behavior: 'smooth' });
  }

  return (
    <>
      {/* Sentinel — sits right above the nav; going out of view triggers "stuck" */}
      <div ref={sentinelRef} className="h-px w-full" />

      <div
        className={`sticky top-0 z-30 w-full transition-shadow ${
          stuck
            ? 'bg-white/95 backdrop-blur-sm border-b border-border shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-2">
          {items.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeId === id
                  ? 'bg-[#fff3f0] text-[#ff724f]'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
