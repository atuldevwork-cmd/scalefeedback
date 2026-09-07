'use client';

import { useState } from 'react';
import { DatePickerInput } from '@/components/ui/date-picker-input';

export type FieldKey = 'title' | 'priority' | 'assignee' | 'dueDate';

export interface FieldSettings {
  label?: string;
  preset?: string;
  required?: boolean;
}
export type FieldSettingsMap = Partial<Record<FieldKey, FieldSettings>>;

interface FieldDef {
  key: FieldKey;
  label: string;
  description: string;
  icon: string;
}

// All four are real — packages/widget/src/core/widget.ts reads
// guestFormFields/memberFormFields and renders a real input/select,
// apps/dashboard/app/api/feedback/route.ts persists all of them. Assignee is
// intentionally offered on Guest Forms too, per explicit product decision —
// enabling it shows the org's team member names (not emails) to anonymous
// reporters via the public widget-config API
// (apps/dashboard/app/api/widget-config/route.ts's assignableMembers). Due
// date needs migration 031_feedback_due_date.sql applied — until then the
// insert silently drops it (PGRST204 fallback in feedback/route.ts) rather
// than failing the whole submission.
const FIELD_DEFS: FieldDef[] = [
  { key: 'title', label: 'Title', description: 'Reporters can add a short title, sent as the issue title.', icon: 'title' },
  { key: 'priority', label: 'Priority', description: 'Reporters can set Low / Medium / High / Critical priority.', icon: 'flag' },
  { key: 'assignee', label: 'Assignee', description: 'Reporters can pick who the issue is for, from your team.', icon: 'person' },
  { key: 'dueDate', label: 'Due date', description: 'Reporters can suggest a due date for the issue.', icon: 'calendar_today' },
];

const SELECT_CLASS = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all';
const INPUT_CLASS = SELECT_CLASS + ' placeholder:text-gray-400';

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ff724f]/50 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${checked ? 'bg-[#ff724f]' : 'bg-gray-200'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

interface Props {
  fields: FieldKey[];
  onChange: (next: FieldKey[]) => void;
  settings: FieldSettingsMap;
  onSettingsChange: (next: FieldSettingsMap) => void;
  assignableMembers: { id: string; name: string }[];
}

// One shared set of fields for the whole form — not per issue type. Bug,
// Idea, Question, and Other all ask for the same hidden fields; the "Forms"
// list to the left only controls which issue types are offered at all, not
// what each one asks for.
export function IssueFieldsEditor({ fields, onChange, settings, onSettingsChange, assignableMembers }: Props) {
  const [draggedField, setDraggedField] = useState<FieldKey | null>(null);
  const [dragOverZone, setDragOverZone] = useState<'visible' | 'hidden' | null>(null);
  const [expanded, setExpanded] = useState<FieldKey | null>(null);

  function moveField(key: FieldKey, toZone: 'visible' | 'hidden') {
    const isVisible = fields.includes(key);
    if (toZone === 'visible' && !isVisible) onChange([...fields, key]);
    if (toZone === 'hidden' && isVisible) {
      onChange(fields.filter((f) => f !== key));
      // Hidden fields can't be required — clear it so the stored config never
      // silently disagrees with what the (disabled) toggle shows.
      if (settings[key]?.required) {
        onSettingsChange({ ...settings, [key]: { ...settings[key], required: false } });
      }
    }
  }

  function patchSettings(key: FieldKey, patch: Partial<FieldSettings>) {
    onSettingsChange({ ...settings, [key]: { ...settings[key], ...patch } });
  }

  function renderSettingsPanel(f: FieldDef, isVisible: boolean) {
    const s = settings[f.key] ?? {};
    return (
      <div className="px-3 pb-3 pt-1 space-y-3 bg-gray-50/60 border-t border-gray-100">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Custom label</label>
          <input
            type="text"
            value={s.label ?? ''}
            onChange={(e) => patchSettings(f.key, { label: e.target.value || undefined })}
            placeholder={f.label}
            className={INPUT_CLASS}
          />
        </div>

        {f.key === 'title' ? (
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-[#ff724f] mt-0.5 shrink-0">auto_awesome</span>
            Title is automatically generated with AI from description. When enabled, Title cannot be shown to the reporter.
          </p>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Preset value</label>
              {f.key === 'priority' && (
                <select
                  value={s.preset ?? ''}
                  onChange={(e) => patchSettings(f.key, { preset: e.target.value || undefined })}
                  className={SELECT_CLASS}
                >
                  <option value="">Select priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              )}
              {f.key === 'assignee' && (
                <select
                  value={s.preset ?? ''}
                  onChange={(e) => patchSettings(f.key, { preset: e.target.value || undefined })}
                  className={SELECT_CLASS}
                >
                  <option value="">Select user</option>
                  {assignableMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              )}
              {f.key === 'dueDate' && (
                <DatePickerInput
                  value={s.preset ?? ''}
                  onChange={(v) => patchSettings(f.key, { preset: v || undefined })}
                  placeholder="Select date"
                  className={INPUT_CLASS}
                />
              )}
              {!isVisible && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Sent automatically even though reporters won&apos;t see this field.
                </p>
              )}
              {s.preset && (
                <button
                  type="button"
                  onClick={() => patchSettings(f.key, { preset: undefined })}
                  className="text-xs text-[#ff724f] hover:text-[#e8603a] font-medium mt-1.5"
                >
                  Reset to default value
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Required</p>
                {!isVisible && (
                  <p className="text-xs text-muted-foreground">Hidden fields can&apos;t be set to required.</p>
                )}
              </div>
              <Toggle
                checked={!!s.required && isVisible}
                disabled={!isVisible}
                onChange={(v) => patchSettings(f.key, { required: v })}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  function renderChip(f: FieldDef, zone: 'visible' | 'hidden') {
    const isExpanded = expanded === f.key;
    return (
      <div
        key={f.key}
        className={`rounded-lg border overflow-hidden transition-colors ${
          zone === 'hidden' ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'
        }`}
      >
        <div
          draggable
          onDragStart={() => setDraggedField(f.key)}
          onDragEnd={() => setDraggedField(null)}
          className={`flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing ${zone === 'hidden' ? 'opacity-70' : ''}`}
        >
          <span className="material-symbols-outlined text-[16px] text-gray-300 shrink-0">drag_indicator</span>
          <span className="material-symbols-outlined text-[16px] text-gray-400 shrink-0">{f.icon}</span>
          <span className="text-sm font-medium text-foreground flex-1 truncate">{f.label}</span>
          <button
            type="button"
            onClick={() => moveField(f.key, zone === 'hidden' ? 'visible' : 'hidden')}
            className="text-gray-400 hover:text-gray-600 shrink-0"
            aria-label={zone === 'hidden' ? 'Show field' : 'Hide field'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {zone === 'hidden' ? 'visibility' : 'visibility_off'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded(isExpanded ? null : f.key)}
            className="text-gray-400 hover:text-gray-600 shrink-0"
            aria-label={isExpanded ? 'Collapse field settings' : 'Expand field settings'}
          >
            <span className={`material-symbols-outlined text-[18px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>
        </div>
        {isExpanded && renderSettingsPanel(f, zone === 'visible')}
      </div>
    );
  }

  const visibleDefs = FIELD_DEFS.filter((f) => fields.includes(f.key));
  const hiddenDefs = FIELD_DEFS.filter((f) => !fields.includes(f.key));

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fields</span>
      </div>

      <div className="p-3.5 space-y-3">
        {/* Always-on, non-editable — these match what the widget already
            unconditionally renders for every issue type (see
            renderTypeGrid()/descriptionFieldHtml() in
            packages/widget/src/core/widget.ts), so they're shown here for
            marker.io-style completeness but aren't draggable or configurable. */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 flex items-center justify-between">
          <span className="text-sm text-gray-500">Issue type</span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Always on</span>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 flex items-center justify-between">
          <span className="text-sm text-gray-500">Explain your feedback *</span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Always on</span>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOverZone('visible'); }}
        onDragLeave={() => setDragOverZone(null)}
        onDrop={(e) => { e.preventDefault(); if (draggedField) moveField(draggedField, 'visible'); setDragOverZone(null); }}
        className={`mx-3.5 mb-3 rounded-lg border-2 border-dashed p-2.5 space-y-2 min-h-[56px] transition-colors ${
          dragOverZone === 'visible' ? 'border-[#ff724f] bg-[#fff3f0]' : 'border-gray-100'
        }`}
      >
        {visibleDefs.length === 0 && (
          <p className="text-xs text-gray-400 italic px-1 py-1.5">Drag a field here to ask for it.</p>
        )}
        {visibleDefs.map((f) => renderChip(f, 'visible'))}
      </div>

      <div className="px-3.5 pb-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Hidden fields</p>
        <p className="text-xs text-muted-foreground mb-2">
          Drag a field here to stop asking for it, regardless of issue type.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOverZone('hidden'); }}
        onDragLeave={() => setDragOverZone(null)}
        onDrop={(e) => { e.preventDefault(); if (draggedField) moveField(draggedField, 'hidden'); setDragOverZone(null); }}
        className={`mx-3.5 mb-3.5 rounded-lg border-2 border-dashed p-2.5 space-y-2 min-h-[56px] transition-colors ${
          dragOverZone === 'hidden' ? 'border-gray-400 bg-gray-50' : 'border-gray-100'
        }`}
      >
        {hiddenDefs.length === 0 && (
          <p className="text-xs text-gray-400 italic px-1 py-1.5">Drag a field here to stop asking for it.</p>
        )}
        {hiddenDefs.map((f) => renderChip(f, 'hidden'))}
      </div>
    </div>
  );
}
