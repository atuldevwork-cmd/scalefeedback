'use client';

export type FieldKey = 'title' | 'priority' | 'assignee' | 'dueDate';

interface FieldDef {
  key: FieldKey;
  label: string;
  description: string;
  // Whether toggling this field on actually changes what the widget renders
  // and sends. All four are real now (packages/widget/src/core/widget.ts
  // reads guestFormFields/memberFormFields and renders a real input/select,
  // apps/dashboard/app/api/feedback/route.ts persists all of them). Assignee
  // is intentionally offered on Guest Forms too, per explicit product
  // decision — enabling it shows the org's team member names (not emails)
  // to anonymous reporters via the public widget-config API
  // (apps/dashboard/app/api/widget-config/route.ts's assignableMembers).
  // Due date needs migration 031_feedback_due_date.sql applied — until then
  // the insert silently drops it (PGRST204 fallback in feedback/route.ts)
  // rather than failing the whole submission.
  wired: boolean;
}

const FIELD_DEFS: FieldDef[] = [
  { key: 'title', label: 'Title', description: 'Reporters can add a short title, sent as the issue title.', wired: true },
  { key: 'priority', label: 'Priority', description: 'Reporters can set Low / Medium / High / Critical priority.', wired: true },
  { key: 'assignee', label: 'Assignee', description: 'Reporters can pick who the issue is for, from your team.', wired: true },
  { key: 'dueDate', label: 'Due date', description: 'Reporters can suggest a due date for the issue.', wired: true },
];

function FieldToggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ff724f]/50 cursor-pointer ${
        checked ? 'bg-[#ff724f]' : 'bg-gray-200'
      }`}
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
}

// One shared set of fields for the whole form — not per issue type. Bug,
// Idea, Question, and Other all ask for the same hidden fields; the "Forms"
// list to the left only controls which issue types are offered at all, not
// what each one asks for.
export function IssueFieldsEditor({ fields, onChange }: Props) {
  function handleToggle(key: FieldKey, value: boolean) {
    const next = value ? [...fields, key] : fields.filter((f) => f !== key);
    onChange(next);
  }

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
            marker.io-style completeness but have no toggle. */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 flex items-center justify-between">
          <span className="text-sm text-gray-500">Issue type</span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Always on</span>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 flex items-center justify-between">
          <span className="text-sm text-gray-500">Explain your feedback *</span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Always on</span>
        </div>
      </div>

      <div className="px-3.5 pb-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Hidden fields</p>
        <p className="text-xs text-muted-foreground mb-2">
          Turn these on to ask for them, regardless of issue type.
        </p>
      </div>

      <div className="divide-y divide-gray-100 px-3.5 pb-3.5">
        {FIELD_DEFS.map((f) => {
          const checked = fields.includes(f.key);
          return (
            <div key={f.key} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-foreground">{f.label}</p>
                  {!f.wired && (
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full tracking-wide">
                      SOON
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
              </div>
              <FieldToggle checked={checked} onChange={(v) => handleToggle(f.key, v)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
