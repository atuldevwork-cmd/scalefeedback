'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { marketingUrl } from '@/lib/marketing-url';
import type { Project } from '@pinmarks/shared';

interface Props {
  project: Project;
  plan: 'free' | 'pro' | 'agency';
}

/* ─── Shared toggle switch (matches ScreenCapturePanel / SessionReplayPanel) ── */

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  title,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      title={title}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ff724f]/50 disabled:opacity-60 ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-[#ff724f]' : 'bg-gray-200'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/* ─── Chip / tag input — used by the Network requests exclusion lists ──────── */

function ChipInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');

  function commit() {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  }

  return (
    <div className="border border-gray-200 rounded-xl px-2.5 py-2 bg-white focus-within:ring-2 focus-within:ring-[#ff724f]/30 focus-within:border-[#ff724f] transition-all">
      <div className="flex flex-wrap items-center gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-medium pl-2 pr-1 py-1 rounded-md"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-gray-400 hover:text-gray-700 leading-none"
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
            if (e.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={commit}
          placeholder={values.length ? '' : placeholder}
          className="flex-1 min-w-[100px] text-sm outline-none py-0.5 bg-transparent"
        />
      </div>
    </div>
  );
}

/* ─── Console logs — real, wired end-to-end: this toggle is `collectConsole`,
   which packages/widget/src/core/widget.ts already reads at runtime
   (`if (config.collectConsole) ConsoleCapture.start();`). ─────────────────── */
function ConsoleLogsSection({ project }: { project: Project }) {
  const cfg = (project.widget_config ?? {}) as unknown as Record<string, unknown>;
  const [enabled, setEnabled] = useState<boolean>(cfg.collectConsole !== false); // defaults to true
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleToggle(value: boolean) {
    setEnabled(value);
    setSaving(true);
    await supabase
      .from('projects')
      .update({ widget_config: { ...cfg, collectConsole: value } })
      .eq('id', project.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="flex items-start justify-between gap-6 py-5 border-b border-gray-100">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">Console logs</span>
          {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
          {saved && !saving && <span className="text-xs text-green-600 font-medium">Saved!</span>}
        </div>
        <p className="text-sm text-muted-foreground">
          Record JavaScript console logs. When enabled, records JS console logs and exceptions and adds them to new issues.
        </p>
      </div>
      <ToggleSwitch checked={enabled} onChange={handleToggle} disabled={saving} />
    </div>
  );
}

/* ─── Network requests — toggle is real (`collectNetwork`, already read by
   packages/widget/src/core/widget.ts and gated Pro+ server-side in
   apps/dashboard/app/api/widget-config/route.ts). The two exclusion lists
   below (`networkExcludedKeys` / `networkExcludedDomains`) are settings-only:
   they persist to widget_config but the widget's NetworkCapture
   (packages/widget/src/capture/network.ts) does not yet read them to redact
   header/body values or skip domains — that capture-side redaction logic is
   a separate, larger change and is out of scope here. ───────────────────── */
function NetworkRequestsSection({ project, plan }: { project: Project; plan: 'free' | 'pro' | 'agency' }) {
  const cfg = (project.widget_config ?? {}) as unknown as Record<string, unknown>;
  const locked = plan === 'free';

  const [enabled, setEnabled] = useState<boolean>(Boolean(cfg.collectNetwork));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [excludedKeys, setExcludedKeys] = useState<string[]>(
    Array.isArray(cfg.networkExcludedKeys) ? (cfg.networkExcludedKeys as string[]) : ['username', 'password', 'token']
  );
  const [excludedDomains, setExcludedDomains] = useState<string[]>(
    Array.isArray(cfg.networkExcludedDomains) ? (cfg.networkExcludedDomains as string[]) : []
  );
  const [savingLists, setSavingLists] = useState(false);
  const [savedLists, setSavedLists] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleToggle(value: boolean) {
    if (locked) return;
    setEnabled(value);
    setSaving(true);
    await supabase
      .from('projects')
      .update({ widget_config: { ...cfg, collectNetwork: value } })
      .eq('id', project.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function handleSaveLists() {
    setSavingLists(true);
    await supabase
      .from('projects')
      .update({
        widget_config: {
          ...cfg,
          networkExcludedKeys: excludedKeys,
          networkExcludedDomains: excludedDomains,
        },
      })
      .eq('id', project.id);
    setSavingLists(false);
    setSavedLists(true);
    setTimeout(() => setSavedLists(false), 2000);
    router.refresh();
  }

  return (
    <div className="py-5 border-b border-gray-100">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground">Network requests</span>
            {locked && (
              <span className="inline-flex items-center gap-1 bg-[#fff3f0] text-[#ff724f] text-[11px] font-semibold px-1.5 py-0.5 rounded-md">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Pro
              </span>
            )}
            {!locked && saving && <span className="text-xs text-muted-foreground">Saving…</span>}
            {!locked && saved && !saving && <span className="text-xs text-green-600 font-medium">Saved!</span>}
          </div>
          <p className="text-sm text-muted-foreground">
            Record network requests. When enabled, records network logs and failed requests and adds them to new issues.
          </p>
          {locked && (
            <a
              href={marketingUrl('/pricing')}
              className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#ff724f] hover:underline"
            >
              Upgrade to Pro to unlock Network requests
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          )}
        </div>
        <ToggleSwitch
          checked={enabled}
          onChange={handleToggle}
          disabled={saving || locked}
          title={locked ? 'Upgrade to Pro to enable Network requests' : undefined}
        />
      </div>

      {enabled && !locked && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Keys excluded</label>
            <p className="text-xs text-muted-foreground mb-2">
              Exclude values with these keys from headers and JSON bodies.
            </p>
            <ChipInput values={excludedKeys} onChange={setExcludedKeys} placeholder="e.g. password" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Domains excluded</label>
            <p className="text-xs text-muted-foreground mb-2">
              Exclude requests to these domains. Supports <code className="bg-muted px-1 rounded">*</code> wildcards.
            </p>
            <ChipInput values={excludedDomains} onChange={setExcludedDomains} placeholder="e.g. *.analytics.com" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              onClick={handleSaveLists}
              disabled={savingLists}
              className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              {savingLists ? 'Saving…' : 'Save'}
            </button>
            {savedLists && <span className="text-xs text-green-600 font-medium">Saved!</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Custom metadata — settings-only placeholder. `customMetadataEnabled`
   persists to widget_config but nothing reads it yet: the widget snippet has
   no metadata-injection API today (packages/widget/src/core/api.ts's
   `customMetadata` field is always sent empty — see submitFeedback() call
   site in widget.ts), so there's no snippet payload for this toggle to
   surface. Wiring that up is a separate, larger widget-snippet change. ───── */
function CustomMetadataSection({ project }: { project: Project }) {
  const cfg = (project.widget_config ?? {}) as unknown as Record<string, unknown>;
  const [enabled, setEnabled] = useState<boolean>(Boolean(cfg.customMetadataEnabled));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleToggle(value: boolean) {
    setEnabled(value);
    setSaving(true);
    await supabase
      .from('projects')
      .update({ widget_config: { ...cfg, customMetadataEnabled: value } })
      .eq('id', project.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  const helper: ReactNode = (
    <>
      Inject custom metadata. When enabled, injects custom metadata provided in the snippet and adds it to new issues.
    </>
  );

  return (
    <div className="flex items-start justify-between gap-6 py-5">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">Custom metadata</span>
          {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
          {saved && !saving && <span className="text-xs text-green-600 font-medium">Saved!</span>}
        </div>
        <p className="text-sm text-muted-foreground">{helper}</p>
      </div>
      <ToggleSwitch checked={enabled} onChange={handleToggle} disabled={saving} />
    </div>
  );
}

/* ─── Main panel ──────────────────────────────────────────────────────────── */

export function DeveloperToolsPanel({ project, plan }: Props) {
  return (
    <div>
      <ConsoleLogsSection project={project} />
      <NetworkRequestsSection project={project} plan={plan} />
      <CustomMetadataSection project={project} />
    </div>
  );
}
