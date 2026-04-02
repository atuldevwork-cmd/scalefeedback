'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  {
    group: 'Personal',
    items: [
      { label: 'Profile', href: '/settings/profile' },
      { label: 'Accounts', href: '/settings/accounts' },
    ],
  },
  {
    group: 'Workspace',
    items: [
      { label: 'General', href: '/settings/general' },
      { label: 'Members', href: '/settings/team' },
    ],
  },
  {
    group: 'Integrations',
    items: [
      { label: 'Connected apps', href: '/settings/apps' },
    ],
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Settings</span>
      </div>
      <nav className="p-2 space-y-4">
        {NAV.map(({ group, items }) => (
          <div key={group}>
            <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group}
            </p>
            {items.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  pathname === href
                    ? 'bg-[#fff3f0] text-[#ff724f] font-medium'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
