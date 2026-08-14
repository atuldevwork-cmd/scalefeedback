'use client';

import type { Feedback } from '@pinmarks/shared';

interface Props { feedback: Feedback[] }

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className={`text-3xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-sm font-medium text-foreground">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-sm text-muted-foreground capitalize shrink-0">{label.replace('_', ' ')}</div>
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-14 text-right text-sm font-medium text-foreground">{count} <span className="text-muted-foreground font-normal text-xs">({pct}%)</span></div>
    </div>
  );
}

export function AnalyticsClient({ feedback }: Props) {
  const total = feedback.length;
  const open = feedback.filter((f) => f.status === 'open').length;
  const resolved = feedback.filter((f) => f.status === 'resolved').length;

  // Avg resolution time (ms → hours)
  const resolvedItems = feedback.filter((f) => f.status === 'resolved' && f.updated_at);
  const avgHours = resolvedItems.length
    ? Math.round(resolvedItems.reduce((acc, f) => acc + (new Date(f.updated_at!).getTime() - new Date(f.created_at).getTime()), 0) / resolvedItems.length / 3600000)
    : null;

  // Last 30 days daily buckets
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  const byDay = Object.fromEntries(days.map((d) => [d, 0]));
  feedback.forEach((f) => {
    const day = f.created_at.slice(0, 10);
    if (day in byDay) byDay[day]++;
  });
  const dayValues = days.map((d) => byDay[d]);
  const maxDay = Math.max(...dayValues, 1);

  // By type
  const types = ['bug', 'suggestion', 'question', 'other'] as const;
  const typeColors: Record<string, string> = { bug: 'bg-red-400', suggestion: 'bg-[#ff724f]', question: 'bg-blue-400', other: 'bg-gray-400' };
  const byType = Object.fromEntries(types.map((t) => [t, feedback.filter((f) => f.type === t).length]));

  // By status
  const statuses = ['open', 'in_progress', 'resolved', 'closed', 'wont_fix'] as const;
  const statusColors: Record<string, string> = { open: 'bg-blue-400', in_progress: 'bg-yellow-400', resolved: 'bg-green-400', closed: 'bg-gray-400', wont_fix: 'bg-red-300' };
  const byStatus = Object.fromEntries(statuses.map((s) => [s, feedback.filter((f) => f.status === s).length]));

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total feedback" value={total} color="text-[#111111]" />
        <StatCard label="Open" value={open} sub="needs attention" color="text-blue-600" />
        <StatCard label="Resolved" value={resolved} sub={`${total > 0 ? Math.round((resolved / total) * 100) : 0}% resolution rate`} color="text-green-600" />
        <StatCard label="Avg resolution" value={avgHours != null ? `${avgHours}h` : '—'} sub="time to resolve" color="text-orange-600" />
      </div>

      {/* Feedback over time */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-foreground mb-6">Feedback over time (last 30 days)</h2>
        {total === 0 ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {dayValues.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full bg-[#ff724f]/20 hover:bg-[#ff724f] rounded-t transition-colors"
                  style={{ height: `${(v / maxDay) * 100}%`, minHeight: v > 0 ? '4px' : '0' }}
                />
                {i % 7 === 0 && (
                  <div className="absolute -bottom-5 text-xs text-muted-foreground whitespace-nowrap">
                    {days[i].slice(5)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-8" />
      </div>

      {/* By type + By status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">By type</h2>
          <div className="space-y-3">
            {types.map((t) => (
              <BarRow key={t} label={t} count={byType[t]} total={total} color={typeColors[t]} />
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">By status</h2>
          <div className="space-y-3">
            {statuses.map((s) => (
              <BarRow key={s} label={s} count={byStatus[s]} total={total} color={statusColors[s]} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
