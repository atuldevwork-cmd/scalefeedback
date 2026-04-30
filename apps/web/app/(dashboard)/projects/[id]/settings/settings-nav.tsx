'use client';

import { useEffect, useState } from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface Props {
  items: NavItem[];
}

export function SettingsNav({ items }: Props) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-10% 0px -75% 0px' }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 24;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  return (
    <nav className="space-y-0.5">
      {items.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => scrollTo(id)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${
            activeId === id
              ? 'bg-[#fff3f0] text-[#ff724f] font-medium'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <span className="w-4 h-4 shrink-0">{icon}</span>
          {label}
        </button>
      ))}
    </nav>
  );
}
