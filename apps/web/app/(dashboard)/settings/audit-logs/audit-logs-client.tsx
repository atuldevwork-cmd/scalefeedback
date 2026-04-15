'use client';

import { useState, useMemo } from 'react';
import type { AuditLogEntry } from './page';

// ─── action metadata ───────────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  'project.created':    { label: 'Project created',     icon: 'add_circle',      color: 'text-green-700',  bg: 'bg-green-50' },
  'project.deleted':    { label: 'Project deleted',     icon: 'delete',          color: 'text-red-700',    bg: 'bg-red-50' },
  'project.updated':    { label: 'Project updated',     icon: 'edit',            color: 'text-blue-700',   bg: 'bg-blue-50' },
  'member.invited':     { label: 'Member invited',      icon: 'person_add',      color: 'text-blue-700',   bg: 'bg-blue-50' },
  'member.removed':     { label: 'Member removed',      icon: 'person_remove',   color: 'text-red-700',    bg: 'bg-red-50' },
  'member.role_changed':{ label: 'Role changed',        icon: 'manage_accounts', color: 'text-[#7c3aed]',  bg: 'bg-purple-50' },
  'feedback.created':   { label: 'Feedback submitted',  icon: 'add_comment',     color: 'text-[#ff724f]',  bg: 'bg-[#fff3f0]' },
  'feedback.status_changed': { label: 'Status changed', icon: 'task_alt',        color: 'text-[#ff724f]',  bg: 'bg-[#fff3f0]' },
};

const ACTION_GROUPS = [
  { label: 'All events', value: 'all' },
  { label: 'Projects',   value: 'project' },
  { label: 'Members',    value: 'member' },
  { label: 'Feedback',   value: 'feedback' },
];

function getMeta(action: string) {
  return ACTION_META[action] ?? {
    label: action,
    icon: 'history',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
  };
}

// ─── helpers ───────────────────────────────────────────────────────────────────

function formatTs(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1)   return 'just now';
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7)   return `${diffDays}d ago`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fullTs(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function detailSummary(entry: AuditLogEntry): string {
  const d = entry.details ?? {};
  switch (entry.action) {
    case 'project.created':
    case 'project.deleted':
    case 'project.updated':
      return d.name ? String(d.name) : (entry.target_id ?? '');
    case 'member.invited':
      return d.email ? `${d.email} as ${d.role}` : (entry.target_id ?? '');
    case 'member.removed':
      return d.removed_email ? `${d.removed_email} (${d.removed_role})` : (entry.target_id ?? '');
    case 'member.role_changed':
      return `${d.previous_role} → ${d.new_role}`;
    case 'feedback.status_changed':
      return `${d.previous_status} → ${d.new_status}`;
    default:
      return entry.target_id ?? '';
  }
}

// ─── row ───────────────────────────────────────────────────────────────────────

function LogRow({ entry }: { entry: AuditLogEntry }) {
  const meta = getMeta(entry.action);
  const actor = entry.actor;
  const actorLabel = actor?.name || actor?.email || 'System';
  const actorInitial = actorLabel.charAt(0).toUpperCase();

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors group">
      {/* Timestamp */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <span className="text-xs text-gray-400" title={fullTs(entry.created_at)}>
          {formatTs(entry.created_at)}
        </span>
      </td>

      {/* Actor */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#fff3f0] flex items-center justify-center text-[10px] font-bold text-[#ff724f] shrink-0">
            {actorInitial}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate max-w-[120px]">{actor?.name || 'System'}</p>
            {actor?.email && (
              <p className="text-[11px] text-gray-400 truncate max-w-[120px]">{actor.email}</p>
            )}
          </div>
        </div>
      </td>

      {/* Event */}
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}>
          <span className="material-symbols-outlined text-[13px]">{meta.icon}</span>
          {meta.label}
        </span>
      </td>

      {/* Target */}
      <td className="px-5 py-3.5">
        {entry.target_type && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-mono">
            {entry.target_type}
          </span>
        )}
      </td>

      {/* Details */}
      <td className="px-5 py-3.5 max-w-[220px]">
        <p className="text-xs text-gray-500 truncate">{detailSummary(entry)}</p>
      </td>
    </tr>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export function AuditLogsClient({ logs, total }: { logs: AuditLogEntry[]; total: number }) {
  const [search, setSearch] = useState('');
  const [actionGroup, setActionGroup] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchGroup = actionGroup === 'all' || l.action.startsWith(actionGroup + '.');
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        l.action.includes(q) ||
        (l.actor?.name ?? '').toLowerCase().includes(q) ||
        (l.actor?.email ?? '').toLowerCase().includes(q) ||
        (l.target_id ?? '').toLowerCase().includes(q) ||
        JSON.stringify(l.details ?? {}).toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
  }, [logs, search, actionGroup]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#300a46]">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          A detailed trail of workspace activity — who did what and when.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total events', value: total },
          {
            label: 'Last 24 hours',
            value: logs.filter((l) => Date.now() - new Date(l.created_at).getTime() < 86400000).length,
          },
          {
            label: 'Unique actors',
            value: new Set(logs.map((l) => l.actor?.email).filter(Boolean)).size,
          },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-[#300a46]">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Action group tabs */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
          {ACTION_GROUPS.map((g) => (
            <button
              key={g.value}
              onClick={() => { setActionGroup(g.value); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                actionGroup === g.value
                  ? 'bg-white text-[#300a46] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px] pointer-events-none">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by actor, event, target…"
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all bg-white"
          />
        </div>

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center bg-white">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="material-symbols-outlined text-gray-400 text-[28px]">
              {search ? 'search_off' : 'history'}
            </span>
          </div>
          <h3 className="font-semibold text-[#300a46] text-base mb-1">
            {search ? 'No matching events' : 'No audit events yet'}
          </h3>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            {search
              ? 'Try a different search term or clear the filter.'
              : 'Events will appear here as your team takes actions in the workspace.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Time</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Actor</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Event</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Target</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Details</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((entry) => (
                <LogRow key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/40">
              <span className="text-xs text-gray-400">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500">
                  Page {page + 1} / {pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={page >= pageCount - 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
