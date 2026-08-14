'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LIVE_INTEGRATIONS } from '@/lib/cms-plugins';
import { DOC_SECTIONS } from '@/lib/docs-sections';

export function DocsSidebar() {
  const pathname = usePathname();
  const onMainDocsPage = pathname === '/docs';

  function handleClick(id: string, e: React.MouseEvent) {
    if (onMainDocsPage) {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-muted/30 py-8 px-4 sticky top-14 h-[calc(100vh-3.5rem)] hidden lg:block overflow-y-auto">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 px-2">On this page</p>
      <nav className="space-y-0.5">
        {DOC_SECTIONS.map((s) => (
          <div key={s.id}>
            <Link
              href={`/docs#${s.id}`}
              onClick={(e) => handleClick(s.id, e)}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {s.label}
            </Link>
            {s.id === 'cms' && (
              <div className="ml-3 pl-2 border-l border-border space-y-0.5 mb-1">
                {LIVE_INTEGRATIONS.map(({ id, name }) => {
                  const isActive = pathname === `/docs/${id}`;
                  return (
                    <Link
                      key={id}
                      href={`/docs/${id}`}
                      className={`block px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        isActive
                          ? 'bg-[#fff3f0] text-[#ff724f] font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
