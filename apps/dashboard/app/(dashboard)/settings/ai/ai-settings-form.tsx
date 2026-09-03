'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { marketingUrl } from '@/lib/marketing-url';
import type { AiSettings } from '@pinmarks/shared';

const DEFAULT_SETTINGS: AiSettings = {
  translate_enabled: true,
  team_language: 'English',
  title_generation_enabled: false,
  magic_rewrite_enabled: true,
};

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Dutch',
  'Japanese', 'Korean', 'Chinese (Simplified)', 'Hindi', 'Arabic',
];

function LockBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-[#fff3f0] text-[#ff724f] text-[11px] font-semibold px-1.5 py-0.5 rounded-md">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      Pro
    </span>
  );
}

function Toggle({
  enabled,
  disabled,
  onChange,
}: {
  enabled: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ff724f]/50 disabled:opacity-60 ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${enabled ? 'bg-[#ff724f]' : 'bg-gray-200'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function AiSettingsForm({ canManage, plan }: { canManage: boolean; plan: 'free' | 'pro' | 'agency' }) {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  const locked = plan === 'free' || !canManage;

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: member } = await supabase
        .from('members')
        .select('organisation_id')
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!member?.organisation_id) { setLoading(false); return; }

      const { data: org } = await supabase
        .from('organisations')
        .select('id, ai_settings')
        .eq('id', member.organisation_id)
        .single();

      if (org) {
        setOrgId(org.id);
        setSettings({ ...DEFAULT_SETTINGS, ...(org.ai_settings ?? {}) });
      }
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line

  async function save(next: AiSettings) {
    if (!orgId || plan === 'free' || !canManage) return;
    setSettings(next);
    setSaving(true);
    await supabase.from('organisations').update({ ai_settings: next }).eq('id', orgId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return <div className="p-8 max-w-2xl text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-2xl font-bold text-gray-900">AI</h1>
        <span className="bg-violet-100 text-violet-600 text-[11px] font-semibold px-1.5 py-0.5 rounded-md">Beta</span>
        {saving && <span className="text-xs text-muted-foreground ml-1">Saving…</span>}
        {saved && !saving && <span className="text-xs text-green-600 font-medium ml-1">Saved!</span>}
      </div>
      <p className="text-sm text-gray-500 mb-6">Save time with AI-powered features.</p>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
        <svg className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-900">Private and secure by design.</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Runs on Pinmarks infrastructure. Your data never leaves your workspace and is never used to train models.
          </p>
        </div>
      </div>

      {!canManage && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl mb-6">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          You have read-only access. Only admins and owners can change AI settings.
        </div>
      )}

      {plan === 'free' && (
        <div className="flex items-center justify-between gap-4 bg-[#fff3f0] border border-[#ffd9cc] rounded-xl px-4 py-3 mb-6">
          <p className="text-sm text-[#c9502f]">AI features require a Pro plan or above.</p>
          <a
            href={marketingUrl('/pricing')}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[#ff724f] hover:underline"
          >
            Upgrade
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      )}

      <div className="space-y-6">
        {/* AI Translation */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-semibold text-gray-900">AI Translation</h2>
            {plan === 'free' && <LockBadge />}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Collect feedback in any language. Reporters write in their language, your team reads in yours.
          </p>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Team language</label>
            <select
              value={settings.team_language}
              disabled={locked}
              onChange={(e) => save({ ...settings, team_language: e.target.value })}
              className="w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Translate incoming feedback</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Incoming feedback is automatically translated into your team&apos;s language.
              </p>
            </div>
            <Toggle
              enabled={settings.translate_enabled}
              disabled={locked}
              onChange={(v) => save({ ...settings, translate_enabled: v })}
            />
          </div>
        </div>

        {/* AI Title Generation */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-semibold text-gray-900">AI Title Generation</h2>
                {plan === 'free' && <LockBadge />}
              </div>
              <p className="text-sm text-gray-500">
                Automatically generate a clear title from the feedback description.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                When enabled, the Title field is hidden for reporters and a title is generated automatically.
              </p>
            </div>
            <Toggle
              enabled={settings.title_generation_enabled}
              disabled={locked}
              onChange={(v) => save({ ...settings, title_generation_enabled: v })}
            />
          </div>
        </div>

        {/* AI Magic Rewrite */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-semibold text-gray-900">AI Magic Rewrite</h2>
                {plan === 'free' && <LockBadge />}
              </div>
              <p className="text-sm text-gray-500">Help reporters write clearer feedback descriptions.</p>
              <p className="text-xs text-gray-400 mt-1">
                Gives your reporters an <span className="font-medium">Improve with AI</span> button to help rewrite feedback before they hit &quot;Send&quot;.
              </p>
            </div>
            <Toggle
              enabled={settings.magic_rewrite_enabled}
              disabled={locked}
              onChange={(v) => save({ ...settings, magic_rewrite_enabled: v })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
