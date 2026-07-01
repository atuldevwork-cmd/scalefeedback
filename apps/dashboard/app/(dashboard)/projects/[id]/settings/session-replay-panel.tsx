'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Project } from '@scalefeedback/shared';

interface Props {
  project: Project;
}

export function SessionReplayPanel({ project }: Props) {
  const cfg = (project.widget_config ?? {}) as unknown as Record<string, unknown>;
  const [enabled, setEnabled] = useState<boolean>(Boolean(cfg.sessionReplay));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleToggle(value: boolean) {
    setEnabled(value);
    setSaving(true);
    await supabase
      .from('projects')
      .update({ widget_config: { ...cfg, sessionReplay: value } })
      .eq('id', project.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">Session Replay</span>
          {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
          {saved && !saving && <span className="text-xs text-green-600 font-medium">Saved!</span>}
        </div>
        <p className="text-sm text-muted-foreground">
          Automatically record the last 30 seconds of the user&apos;s session when feedback is submitted.
          Replay it alongside the screenshot in the feedback detail view.
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 bg-gray-100 rounded-md px-2 py-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Input values are masked
          </span>
          <span className="inline-flex items-center gap-1 bg-gray-100 rounded-md px-2 py-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Rolling 30s buffer
          </span>
          <span className="inline-flex items-center gap-1 bg-gray-100 rounded-md px-2 py-0.5">
            Powered by rrweb
          </span>
        </div>
      </div>

      {/* Toggle */}
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => handleToggle(!enabled)}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ff724f]/50 disabled:opacity-60 ${
          enabled ? 'bg-[#ff724f]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
