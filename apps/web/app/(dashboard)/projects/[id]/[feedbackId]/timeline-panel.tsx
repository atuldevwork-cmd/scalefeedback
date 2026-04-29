'use client';

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  if (days < 30)  return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatLocal(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month:  'short',
    day:    'numeric',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

interface Props {
  createdAt: string;
  updatedAt: string;
}

export function TimelinePanel({ createdAt, updatedAt }: Props) {
  const showUpdated = updatedAt && updatedAt !== createdAt;

  const events = [
    { label: 'Submitted', iso: createdAt, icon: 'add_circle' },
    ...(showUpdated ? [{ label: 'Last updated', iso: updatedAt, icon: 'edit' }] : []),
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">Timeline</h2>
      <div className="relative space-y-4">
        {/* Vertical line */}
        {events.length > 1 && (
          <div className="absolute left-[11px] top-5 bottom-5 w-px bg-border" />
        )}

        {events.map(({ label, iso, icon }) => (
          <div key={label} className="flex items-start gap-3">
            {/* Dot */}
            <div className="w-6 h-6 rounded-full bg-[#fff3f0] flex items-center justify-center shrink-0 z-10">
              <span className="material-symbols-outlined text-[#ff724f] text-[13px]">{icon}</span>
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p
                className="text-xs text-muted-foreground mt-0.5 cursor-default"
                suppressHydrationWarning
                title={formatLocal(iso)}
              >
                {formatRelative(iso)}
                <span className="ml-1 text-[11px] text-muted-foreground/60" suppressHydrationWarning>
                  · {formatLocal(iso)}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
