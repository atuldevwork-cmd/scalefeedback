'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { marketingUrl } from '@/lib/marketing-url';
import type { Project } from '@pinmarks/shared';

interface Props {
  project: Project;
  plan: 'free' | 'pro' | 'agency';
}

/* ─── Shared toggle switch (matches SessionReplayPanel) ─────────────────────── */

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

/* ─── Basic Auth ──────────────────────────────────────────────────────────────
   Enabled flag lives in widget_config (not a secret, saved the same way as
   every other toggle on this page). Username/password are secrets and are
   fetched/saved through /api/projects/[projectId]/screen-capture, which writes
   to dedicated `projects` columns — never to widget_config, since widget_config
   is returned verbatim by the public /api/widget-config endpoint. */
function BasicAuthSection({ project }: { project: Project }) {
  const cfg = (project.widget_config ?? {}) as unknown as Record<string, unknown>;
  const [enabled, setEnabled] = useState<boolean>(Boolean(cfg.basicAuthEnabled));
  const [savingToggle, setSavingToggle] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hasStoredPassword, setHasStoredPassword] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [savingCreds, setSavingCreds] = useState(false);
  const [savedCreds, setSavedCreds] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetch(`/api/projects/${project.id}/screen-capture`)
      .then((r) => r.json())
      .then((data) => {
        setUsername(data.username ?? '');
        setHasStoredPassword(Boolean(data.hasPassword));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [project.id]);

  async function handleToggle(value: boolean) {
    setEnabled(value);
    setSavingToggle(true);
    await supabase
      .from('projects')
      .update({ widget_config: { ...cfg, basicAuthEnabled: value } })
      .eq('id', project.id);
    setSavingToggle(false);
    router.refresh();
  }

  async function handleSaveCredentials() {
    setSavingCreds(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/screen-capture`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, ...(password ? { password } : {}) }),
      });
      if (res.ok) {
        if (password) setHasStoredPassword(true);
        setPassword('');
        setSavedCreds(true);
        setTimeout(() => setSavedCreds(false), 2000);
      }
    } finally {
      setSavingCreds(false);
    }
  }

  return (
    <div className="py-5 border-b border-gray-100">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground">Basic Auth</span>
            {savingToggle && <span className="text-xs text-muted-foreground">Saving…</span>}
          </div>
          <p className="text-sm text-muted-foreground">
            Use credentials when rendering screenshots on my website.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Required for screenshot rendering on HTTP Basic Auth protected sites when reporters don&apos;t use the browser extension.
          </p>
        </div>
        <ToggleSwitch checked={enabled} onChange={handleToggle} disabled={savingToggle} />
      </div>

      {enabled && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!loaded}
              placeholder="username"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!loaded}
              placeholder={hasStoredPassword ? '••••••••  (saved — leave blank to keep)' : 'password'}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all disabled:bg-gray-50"
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              onClick={handleSaveCredentials}
              disabled={savingCreds || !loaded}
              className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              {savingCreds ? 'Saving…' : 'Save credentials'}
            </button>
            {savedCreds && <span className="text-xs text-green-600 font-medium">Saved!</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Simple widget_config toggle row (Native Screenshot API / Authenticated
   Media Capture) — no plan gate, no secrets. ─────────────────────────────── */
function SimpleToggleSection({
  project,
  configKey,
  title,
  helper,
  betaBadge,
  borderBottom = true,
}: {
  project: Project;
  configKey: 'nativeScreenshotApi' | 'authenticatedMediaCapture';
  title: string;
  helper: ReactNode;
  betaBadge?: boolean;
  borderBottom?: boolean;
}) {
  const cfg = (project.widget_config ?? {}) as unknown as Record<string, unknown>;
  const [enabled, setEnabled] = useState<boolean>(Boolean(cfg[configKey]));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleToggle(value: boolean) {
    setEnabled(value);
    setSaving(true);
    await supabase
      .from('projects')
      .update({ widget_config: { ...cfg, [configKey]: value } })
      .eq('id', project.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className={`flex items-start justify-between gap-6 py-5 ${borderBottom ? 'border-b border-gray-100' : ''}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">{title}</span>
          {betaBadge && (
            <span className="text-[10px] font-bold bg-[#fff3f0] text-[#ff724f] px-1.5 py-0.5 rounded-full tracking-wide">
              BETA
            </span>
          )}
          {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
          {saved && !saving && <span className="text-xs text-green-600 font-medium">Saved!</span>}
        </div>
        <p className="text-sm text-muted-foreground">{helper}</p>
      </div>
      <ToggleSwitch checked={enabled} onChange={handleToggle} disabled={saving} />
    </div>
  );
}

/* ─── Sensitive Data Masking (Agency-gated, documentation-only) ─────────────
   Not a toggle — masking behaviour is driven automatically by CSS classes a
   site owner adds to their own markup. This section just documents the
   convention. Gated visually the same way Monitor/Analytics are gated on the
   project overview page (lock icon + AGENCY badge + marketingUrl('/pricing')). */
function SensitiveDataMaskingSection({ plan }: { plan: 'free' | 'pro' | 'agency' }) {
  const locked = plan !== 'agency';

  const rows: { selector: string; rule: string }[] = [
    {
      selector: '.sf-exclude',
      rule:
        'Exclude is the most private rule. The element itself and all its child elements will be ignored from the capture and replaced by a rectangle filled with a wavy gray and white pattern.',
    },
    {
      selector: '.sf-mask',
      rule:
        'For masked elements, all texts will be replaced by irreversibly transformed placeholder text to look like a wireframe of the original content. The replaced text will retain the size and length of the original text.',
    },
    {
      selector: 'input[type="password"]',
      rule:
        'Secure inputs — All password input values will automatically be replaced by irreversibly transformed placeholder text. Informational only — no class needed, this happens automatically.',
    },
    {
      selector: '.sf-unmask',
      rule: 'You can use the unmask class inside a masked element to prevent the obfuscation of the texts inside that element.',
    },
  ];

  return (
    <div className="pt-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-foreground">Sensitive Data Masking</span>
        {locked && (
          <span className="inline-flex items-center gap-1 bg-[#fff3f0] text-[#ff724f] text-[11px] font-semibold px-1.5 py-0.5 rounded-md">
            <span className="material-symbols-outlined text-[13px]">lock</span>
            Agency
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Add these CSS classes to elements on your own site to control how they&apos;re handled when a screenshot is captured.
      </p>

      {locked ? (
        <a
          href={marketingUrl('/pricing')}
          title="Upgrade to Agency to unlock Sensitive Data Masking"
          className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 hover:border-[#ff724f]/40 transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] text-gray-400">lock</span>
            <div>
              <p className="text-sm font-medium text-gray-800">Upgrade to Agency to enable masking</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically mask or exclude sensitive content — like avatars, personal data, or password fields — from captured screenshots.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-[#fff3f0] text-[#ff724f] px-1.5 py-0.5 rounded-full tracking-wide shrink-0">
            AGENCY
          </span>
        </a>
      ) : null}

      <div className={`overflow-x-auto rounded-xl border border-gray-200 ${locked ? 'opacity-60' : ''}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5 w-40">Selector</th>
              <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-2.5">Rule</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.selector} className="border-b border-gray-100 last:border-b-0">
                <td className="px-4 py-3 align-top">
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-gray-800 whitespace-nowrap">
                    {row.selector}
                  </code>
                </td>
                <td className="px-4 py-3 align-top text-gray-600">{row.rule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Main panel ──────────────────────────────────────────────────────────── */

export function ScreenCapturePanel({ project, plan }: Props) {
  return (
    <div>
      <BasicAuthSection project={project} />

      <SimpleToggleSection
        project={project}
        configKey="nativeScreenshotApi"
        title="Native Screenshot API"
        helper={
          <>
            Use the browser&apos;s native screenshot API when available instead of server-side rendering. Note: the
            snippet config <em>useNativeScreenshot</em> field takes precedence over this setting.
          </>
        }
      />

      <SimpleToggleSection
        project={project}
        configKey="authenticatedMediaCapture"
        title="Capture Behind-Login Content"
        helper="Enable if you see broken images like user avatars in screenshots. ⚠️ May slow down capture speed."
        betaBadge
        borderBottom={false}
      />

      <SensitiveDataMaskingSection plan={plan} />
    </div>
  );
}
