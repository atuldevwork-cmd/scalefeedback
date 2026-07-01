'use client';

import { useEffect, useState } from 'react';
import type { ActivityEntry } from '@/lib/activity-log';

const ACTION_LABELS: Record<string, string> = {
  'feedback.created': 'Submitted feedback',
  'status.changed': 'Changed status',
  'priority.changed': 'Changed priority',
  'assignee.changed': 'Changed assignee',
  'comment.added': 'Left a comment',
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ActivityLogPanel({ feedbackId }: { feedbackId: string }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    fetch(`/api/feedback/${feedbackId}/activity`)
      .then((r) => r.json())
      .then(({ data }) => setEntries(data ?? []));
  }, [feedbackId]);

  if (!entries.length) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-3">Activity</h2>
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="flex gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-[#fff3f0] flex items-center justify-center text-xs font-bold text-[#ff724f] shrink-0 mt-0.5">
              {(entry.actor ?? 'S').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-foreground">{entry.actor ?? 'ClickUp'}</span>
              {' '}
              <span className="text-muted-foreground">{ACTION_LABELS[entry.action] ?? entry.action}</span>
              {entry.metadata?.from != null && entry.metadata?.to != null && (
                <span className="text-muted-foreground">
                  {' '}from <span className="font-medium">{String(entry.metadata.from as string)}</span> to <span className="font-medium">{String(entry.metadata.to as string)}</span>
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{formatRelative(entry.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
