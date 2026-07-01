'use client';

import { ExternalLink } from 'lucide-react';

interface ClickUpTaskData {
  id: string;
  name: string;
  url: string;
  status: { status: string; color: string; type?: string };
  priority?: { priority: string; color: string } | null;
  assignees: { id: number; username: string }[];
}

export function ClickUpTaskPanel({ task }: { task: ClickUpTaskData }) {
  const assignee = task.assignees?.[0]?.username ?? '—';
  const priority = task.priority?.priority ?? '—';
  const statusColor = task.status?.color ?? '#6bc950';

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* ClickUp logo */}
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <path d="M4 22.4L8.3 18.7C10.7 21.4 13.2 22.7 16 22.7C18.8 22.7 21.2 21.4 23.6 18.7L28 22.3C24.6 26.2 20.6 28.3 16 28.3C11.4 28.3 7.4 26.2 4 22.4Z" fill="#8930FD"/>
            <path d="M4 22.4L8.3 18.7C10.7 21.4 13.2 22.7 16 22.7C18.8 22.7 21.2 21.4 23.6 18.7L28 22.3C24.6 26.2 20.6 28.3 16 28.3C11.4 28.3 7.4 26.2 4 22.4Z" fill="url(#cu_gradient)"/>
            <path d="M16 8.2L8.2 14.9L4.6 10.6L16 0.8L27.4 10.6L23.8 14.9L16 8.2Z" fill="#FF02F0"/>
            <path d="M16 8.2L8.2 14.9L4.6 10.6L16 0.8L27.4 10.6L23.8 14.9L16 8.2Z" fill="url(#cu_gradient2)"/>
            <defs>
              <linearGradient id="cu_gradient" x1="4" y1="22" x2="28" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#8930FD"/>
                <stop offset="1" stopColor="#49CCF9"/>
              </linearGradient>
              <linearGradient id="cu_gradient2" x1="4.6" y1="7" x2="27.4" y2="7" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF02F0"/>
                <stop offset="1" stopColor="#FF7C1E"/>
              </linearGradient>
            </defs>
          </svg>
          <span className="text-sm font-semibold text-foreground">ClickUp task</span>
        </div>
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <dl className="space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <dt className="text-muted-foreground w-20 shrink-0">ID</dt>
          <dd className="font-mono text-foreground font-medium">{task.id}</dd>
        </div>
        <div className="flex items-start gap-3">
          <dt className="text-muted-foreground w-20 shrink-0">Title</dt>
          <dd className="font-medium text-foreground leading-snug">{task.name}</dd>
        </div>
        <div className="flex items-start gap-3">
          <dt className="text-muted-foreground w-20 shrink-0">Assignee</dt>
          <dd className="font-medium text-foreground">{assignee}</dd>
        </div>
        <div className="flex items-start gap-3">
          <dt className="text-muted-foreground w-20 shrink-0">Priority</dt>
          <dd className="font-medium text-foreground capitalize">{priority}</dd>
        </div>
        <div className="flex items-start gap-3">
          <dt className="text-muted-foreground w-20 shrink-0">Status</dt>
          <dd>
            <span
              className="inline-flex items-center gap-1.5 border rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide"
              style={{ borderColor: statusColor, color: statusColor }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: statusColor }}
              />
              {task.status?.status ?? '—'}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
