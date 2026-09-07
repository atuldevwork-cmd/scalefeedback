'use client';

import { useEffect, useState } from 'react';
import type { ClickUpFieldMapping, ClickUpDestinationField, PinmarksSourceField } from '@/lib/integrations/clickup';

// Title/Description always populate ClickUp's task name/description directly
// (see lib/integrations/clickup.ts) regardless of mapping, so — like Issue
// type/Explain your feedback in issue-fields-editor.tsx — they aren't offered
// as draggable/hideable here. These 6 are the only real mapping candidates.
const SOURCE_FIELDS: { key: PinmarksSourceField; label: string }[] = [
  { key: 'type', label: 'Issue type' },
  { key: 'priority', label: 'Priority' },
  { key: 'assigned_to', label: 'Assignee' },
  { key: 'due_date', label: 'Due date' },
  { key: 'reporter_name', label: 'Reporter name' },
  { key: 'reporter_email', label: 'Reporter email' },
];

// Sensible first-open defaults that reproduce today's legacy push behavior —
// opening the mapper for the first time shouldn't silently change what gets
// sent until the user actually edits something and hits Save.
const DEFAULT_MAPPINGS: ClickUpFieldMapping[] = [
  { source: 'type', destination: { kind: 'native', key: 'tags' } },
  { source: 'priority', destination: { kind: 'native', key: 'priority' } },
  { source: 'assigned_to', destination: { kind: 'native', key: 'assignees' } },
  { source: 'due_date', destination: { kind: 'native', key: 'due_date' } },
];
const DEFAULT_HIDDEN: PinmarksSourceField[] = ['reporter_name', 'reporter_email'];

const PREVIEW_VALUES: Partial<Record<PinmarksSourceField, string>> = {
  type: 'Bug',
  priority: 'High',
  assigned_to: 'Jane Smith',
  due_date: 'Jul 12',
  reporter_name: 'Jane Smith',
  reporter_email: 'jane@company.com',
};

// Pinmarks' priority/type are fixed enum strings — until per-option value
// mapping ships, these can only go to a native destination or a plain text
// custom field, never a dropdown/label custom field (which needs the
// destination's own option ids, not ours).
const ENUM_SOURCES: PinmarksSourceField[] = ['priority', 'type'];
function isCompatibleDestination(source: PinmarksSourceField, dest: ClickUpDestinationField): boolean {
  if (!ENUM_SOURCES.includes(source)) return true;
  if (dest.kind === 'native') return true;
  return dest.type === 'text' || dest.type === 'short_text' || dest.type === 'text_area';
}

interface Props {
  projectId: string;
  listId: string;
  // Every integration's config is a plain string map (see integrations-panel.tsx) —
  // fieldMappings/hiddenFields/fieldMappingsListId are JSON-stringified into it
  // rather than widening that shared type for one integration.
  config: Record<string, string>;
  onSave: (fullConfig: Record<string, string>) => Promise<void>;
}

function safeParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function ClickUpFieldMapper({ projectId, listId, config, onSave }: Props) {
  const [destinations, setDestinations] = useState<ClickUpDestinationField[]>([]);
  const [loadingDest, setLoadingDest] = useState(false);
  const [mappings, setMappings] = useState<ClickUpFieldMapping[]>([]);
  const [hidden, setHidden] = useState<PinmarksSourceField[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draggedField, setDraggedField] = useState<PinmarksSourceField | null>(null);
  const [dragOverZone, setDragOverZone] = useState<'visible' | 'hidden' | null>(null);

  // Seed from saved config (or sensible defaults) whenever the connected list changes.
  useEffect(() => {
    const savedMappings = safeParse<ClickUpFieldMapping[] | undefined>(config.fieldMappings, undefined);
    const savedHidden = safeParse<PinmarksSourceField[] | undefined>(config.hiddenFields, undefined);
    const savedListId = config.fieldMappingsListId;

    if (!savedMappings) {
      setMappings(DEFAULT_MAPPINGS);
      setHidden(DEFAULT_HIDDEN);
      setNotice(null);
      return;
    }

    if (savedListId && savedListId !== listId) {
      // Smart reset: native mappings aren't tied to a specific list, keep
      // them. Custom-field mappings point at the OLD list's field ids —
      // drop them back to Hidden rather than silently sending garbage.
      const kept = savedMappings.filter((m) => m.destination?.kind === 'native');
      const droppedSources = savedMappings
        .filter((m) => m.destination?.kind === 'custom')
        .map((m) => m.source);
      setMappings(kept);
      setHidden([...(savedHidden ?? []), ...droppedSources]);
      setNotice(
        droppedSources.length > 0
          ? `List changed — ${droppedSources.length} field${droppedSources.length > 1 ? 's' : ''} need to be re-mapped.`
          : null
      );
    } else {
      setMappings(savedMappings);
      setHidden(savedHidden ?? []);
      setNotice(null);
    }
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  useEffect(() => {
    if (!listId) return;
    setLoadingDest(true);
    fetch(`/api/clickup/${projectId}/data?type=fields&listId=${listId}`)
      .then((r) => r.json())
      .then(({ data }) => setDestinations(data ?? []))
      .finally(() => setLoadingDest(false));
  }, [projectId, listId]);

  function moveField(source: PinmarksSourceField, toZone: 'visible' | 'hidden') {
    setSaved(false);
    setMappings((prev) => prev.filter((m) => m.source !== source));
    setHidden((prev) => prev.filter((f) => f !== source));
    if (toZone === 'hidden') {
      setHidden((prev) => [...prev, source]);
    } else {
      setMappings((prev) => [...prev, { source, destination: null }]);
    }
  }

  function setDestination(source: PinmarksSourceField, destKey: string) {
    setSaved(false);
    const dest = destinations.find((d) => d.id === destKey);
    if (!dest) return;
    setMappings((prev) =>
      prev.map((m) => (m.source === source ? { ...m, destination: { kind: dest.kind, key: dest.id } } : m))
    );
  }

  const canSave = mappings.every((m) => m.destination !== null);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        ...config,
        fieldMappings: JSON.stringify(mappings),
        hiddenFields: JSON.stringify(hidden),
        fieldMappingsListId: listId,
      });
      setSaved(true);
      setNotice(null);
    } finally {
      setSaving(false);
    }
  }

  function renderChip(field: PinmarksSourceField, label: string, zone: 'visible' | 'hidden') {
    return (
      <div
        key={field}
        draggable
        onDragStart={() => setDraggedField(field)}
        onDragEnd={() => setDraggedField(null)}
        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm cursor-grab active:cursor-grabbing ${
          zone === 'hidden' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        <span className="font-medium text-gray-800 flex-1 truncate">{label}</span>
        <span className="text-[10px] text-gray-400 uppercase shrink-0">Pinmarks</span>
        <button
          type="button"
          onClick={() => moveField(field, zone === 'hidden' ? 'visible' : 'hidden')}
          className="text-gray-400 hover:text-gray-600 shrink-0"
          aria-label={zone === 'hidden' ? 'Show field' : 'Hide field'}
        >
          <span className="material-symbols-outlined text-[16px]">
            {zone === 'hidden' ? 'visibility' : 'visibility_off'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4 mt-3">
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fields</span>
          {loadingDest && <span className="text-xs text-gray-400">Loading ClickUp fields…</span>}
        </div>

        {notice && (
          <div className="mx-3.5 mt-3 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="text-amber-600 hover:text-amber-800 shrink-0" aria-label="Dismiss">
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        )}

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOverZone('visible'); }}
          onDragLeave={() => setDragOverZone(null)}
          onDrop={(e) => { e.preventDefault(); if (draggedField) moveField(draggedField, 'visible'); setDragOverZone(null); }}
          className={`m-3.5 mb-2 rounded-lg border-2 border-dashed p-2.5 space-y-2.5 min-h-[64px] transition-colors ${
            dragOverZone === 'visible' ? 'border-[#ff724f] bg-[#fff3f0]' : 'border-gray-100'
          }`}
        >
          {mappings.length === 0 && (
            <p className="text-xs text-gray-400 italic px-1 py-2">Drag a field here to make it visible.</p>
          )}
          {mappings.map((m) => {
            const def = SOURCE_FIELDS.find((f) => f.key === m.source);
            if (!def) return null;
            const validDestinations = destinations.filter((d) => isCompatibleDestination(m.source, d));
            return (
              <div key={m.source} className="space-y-1.5">
                {renderChip(m.source, def.label, 'visible')}
                <select
                  value={m.destination?.key ?? ''}
                  onChange={(e) => setDestination(m.source, e.target.value)}
                  className="w-full ml-6 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30"
                  style={{ width: 'calc(100% - 1.5rem)' }}
                >
                  <option value="">Select ClickUp field…</option>
                  {validDestinations.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}{d.kind === 'native' ? ' (native)' : ''}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <div className="px-3.5 pb-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Hidden fields</p>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOverZone('hidden'); }}
          onDragLeave={() => setDragOverZone(null)}
          onDrop={(e) => { e.preventDefault(); if (draggedField) moveField(draggedField, 'hidden'); setDragOverZone(null); }}
          className={`mx-3.5 mb-3.5 rounded-lg border-2 border-dashed p-2.5 space-y-2 min-h-[56px] transition-colors ${
            dragOverZone === 'hidden' ? 'border-gray-400 bg-gray-50' : 'border-gray-100'
          }`}
        >
          {hidden.length === 0 && (
            <p className="text-xs text-gray-400 italic px-1 py-2">Drag a field here to stop sending it.</p>
          )}
          {hidden.map((f) => {
            const def = SOURCE_FIELDS.find((s) => s.key === f);
            if (!def) return null;
            return renderChip(f, def.label, 'hidden');
          })}
        </div>

        <div className="flex items-center justify-between px-3.5 pb-3.5 gap-3">
          <p className="text-xs text-gray-400">
            {!canSave ? 'Every visible field needs a ClickUp destination.' : saved ? '✓ Saved' : ''}
          </p>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm disabled:opacity-50 shrink-0"
          >
            {saving ? 'Saving…' : 'Save mapping'}
          </button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
        <div className="px-3.5 py-2.5 bg-white border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</span>
        </div>
        <div className="p-3.5 space-y-2.5">
          <p className="text-xs text-gray-400 mb-1">Illustrative example — not a real feedback item.</p>
          {mappings.filter((m) => m.destination).length === 0 && (
            <p className="text-xs text-gray-400 italic">Nothing mapped yet.</p>
          )}
          {mappings.map((m) => {
            if (!m.destination) return null;
            const def = SOURCE_FIELDS.find((f) => f.key === m.source);
            const dest = destinations.find((d) => d.id === m.destination!.key);
            if (!def || !dest) return null;
            return (
              <div key={m.source} className="flex items-center gap-2 text-xs bg-white border border-gray-100 rounded-lg px-2.5 py-2">
                <span className="font-medium text-gray-700">{def.label}</span>
                <span className="text-gray-300">→</span>
                <span className="font-medium text-[#7B68EE]">{dest.name}</span>
                <span className="ml-auto text-gray-400 truncate">{PREVIEW_VALUES[m.source]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
