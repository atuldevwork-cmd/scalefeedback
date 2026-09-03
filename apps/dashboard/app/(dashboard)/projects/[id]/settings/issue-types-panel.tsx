'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Project, FeedbackType } from '@pinmarks/shared';
import { IssueFieldsEditor, type FieldKey } from './issue-fields-editor';
import { WidgetFieldsPreview } from './widget-fields-preview';

interface Props {
  project: Project;
  /** Which audience's enabled-types list this panel edits. */
  configKey: 'guestFormTypes' | 'memberFormTypes';
}

// The 4 issue types the widget's type picker supports today (see
// packages/widget/src/core/widget.ts) — labels/emoji match what's already
// user-visible in the widget's own type buttons ("Idea" for `suggestion`,
// etc). marker.io's Guest/Member forms also let you add custom issue types
// and rename fields — none of that exists in this codebase (the widget has a
// fixed 4-type enum, there's no per-project custom-issue-type model). This
// panel is scoped to what's real: enable/disable which of the 4 existing
// types this audience sees (left column, "Forms"), and which extra fields
// (Title/Priority/Assignee/Due date) the submission form asks for — the same
// fields regardless of issue type (middle column, "Fields") — with a live
// preview (right column).
export const ISSUE_TYPES: { key: FeedbackType; label: string; icon: string; description: string }[] = [
  { key: 'bug', label: 'Bug', icon: 'bug_report', description: 'Something is broken or not working as expected.' },
  { key: 'suggestion', label: 'Idea', icon: 'lightbulb', description: 'A suggestion or feature request.' },
  { key: 'question', label: 'Question', icon: 'help', description: 'A question rather than a bug or idea.' },
  { key: 'other', label: 'Other', icon: 'build', description: 'Anything that doesn’t fit the categories above.' },
];

// Mirrors packages/widget/src/core/widget.ts's DEFAULT_VISIBLE_FIELDS: when
// guestFormFields/memberFormFields is empty, the widget falls back to
// ['title'] — a Title field is asked by default today (unless AI
// title-generation is on), and Priority/Assignee/Due date never are. The
// settings UI must default to the same thing so the toggles shown here
// always reflect the widget's actual current behavior.
const DEFAULT_VISIBLE_FIELDS: FieldKey[] = ['title'];

function fieldsConfigKeyFor(configKey: 'guestFormTypes' | 'memberFormTypes'): 'guestFormFields' | 'memberFormFields' {
  return configKey === 'guestFormTypes' ? 'guestFormFields' : 'memberFormFields';
}

export function IssueTypesPanel({ project, configKey }: Props) {
  const cfg = (project.widget_config ?? {}) as unknown as Record<string, unknown>;
  const fieldsConfigKey = fieldsConfigKeyFor(configKey);

  const stored = Array.isArray(cfg[configKey]) ? (cfg[configKey] as string[]) : null;
  const [enabledKeys, setEnabledKeys] = useState<FeedbackType[]>(
    stored && stored.length > 0 ? (stored as FeedbackType[]) : ISSUE_TYPES.map((t) => t.key)
  );

  // One shared field list for every issue type on this form (not per-type).
  // Older configs may still have the previous per-type map shape ({bug: [...],
  // idea: [...], ...}) — Array.isArray() rejects that shape and falls back to
  // the default, same as a project that never touched this setting at all.
  const storedFields = cfg[fieldsConfigKey];
  const [fields, setFields] = useState<FieldKey[]>(
    Array.isArray(storedFields) ? (storedFields as FieldKey[]) : DEFAULT_VISIBLE_FIELDS
  );

  const [selectedType, setSelectedType] = useState<FeedbackType>(
    enabledKeys[0] ?? ISSUE_TYPES[0].key
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function persist(patch: Record<string, unknown>) {
    setSaving(true);
    await supabase
      .from('projects')
      .update({ widget_config: { ...cfg, ...patch } })
      .eq('id', project.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  function handleToggleType(key: FeedbackType, value: boolean) {
    // Keep at least one type enabled — an empty list would leave the widget
    // with no type buttons to show at all.
    if (!value && enabledKeys.length === 1 && enabledKeys[0] === key) return;
    const next = value ? [...enabledKeys, key] : enabledKeys.filter((k) => k !== key);
    setEnabledKeys(next);
    void persist({ [configKey]: next });
    // If the type being disabled was selected, move selection to whatever's
    // still enabled so the Fields/Preview columns never point at nothing.
    if (!value && selectedType === key) {
      setSelectedType(next[0] ?? ISSUE_TYPES[0].key);
    }
  }

  function handleFieldsChange(next: FieldKey[]) {
    setFields(next);
    void persist({ [fieldsConfigKey]: next });
  }

  return (
    <div>
      <div className="flex items-center justify-end gap-2 mb-3 h-4">
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
        {saved && !saving && <span className="text-xs text-green-600 font-medium">Saved!</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-4 items-start">
        {/* Left column — Forms: existing issue types + on/off toggle, now also
            clickable to select which type's fields show in the middle column. */}
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
          <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Forms</span>
          </div>
          <div className="divide-y divide-gray-100">
            {ISSUE_TYPES.map((t) => {
              const checked = enabledKeys.includes(t.key);
              const isLastEnabled = checked && enabledKeys.length === 1;
              const isSelected = selectedType === t.key;
              return (
                <div
                  key={t.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedType(t.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedType(t.key); }}
                  className={`flex items-center justify-between gap-3 px-3.5 py-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#fff3f0]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`material-symbols-outlined text-[18px] leading-none shrink-0 ${isSelected ? 'text-[#ff724f]' : 'text-gray-400'}`}>{t.icon}</span>
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#ff724f]' : 'text-foreground'}`}>
                      {t.label}
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={checked}
                    onClick={(e) => { e.stopPropagation(); handleToggleType(t.key, !checked); }}
                    disabled={saving || isLastEnabled}
                    title={isLastEnabled ? 'At least one issue type must stay enabled' : undefined}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ff724f]/50 disabled:opacity-60 ${
                      saving || isLastEnabled ? 'cursor-not-allowed' : 'cursor-pointer'
                    } ${checked ? 'bg-[#ff724f]' : 'bg-gray-200'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
                        checked ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle column — Fields: always-on Issue type / description rows,
            plus the toggleable "Hidden fields" list shared by every type. */}
        <IssueFieldsEditor fields={fields} onChange={handleFieldsChange} />

        {/* Right column — live, static visual preview of the widget chrome.
            Never hits a real API — mirrors packages/widget/src/core/widget.ts's
            actual markup closely enough to show what reporters will see.
            selectedType only changes the "Type" pill shown here — the fields
            below it are the same regardless of which type is selected. */}
        <WidgetFieldsPreview
          selectedType={ISSUE_TYPES.find((t) => t.key === selectedType)!}
          fields={fields}
        />
      </div>
    </div>
  );
}
