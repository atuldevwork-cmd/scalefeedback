'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface NotificationPrefs {
  new_feedback: boolean;
  status_change: boolean;
  comments: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  new_feedback: true,
  status_change: true,
  comments: true,
};

function NotificationToggle({
  label,
  description,
  enabled,
  saving,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  saving: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-400">{description}</div>
      </div>
      <button
        onClick={onChange}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 disabled:opacity-60 ${
          enabled ? 'bg-[#ff724f]' : 'bg-gray-200'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

export function GeneralSettingsForm({ canManage }: { canManage: boolean }) {
  const [orgName, setOrgName] = useState('ScaleStation');
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadPrefs() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('members')
        .select('id, notification_preferences')
        .eq('user_id', user.id)
        .single();

      if (member) {
        setMemberId(member.id);
        setPrefs({ ...DEFAULT_PREFS, ...(member.notification_preferences ?? {}) });
      }
    }
    loadPrefs();
  }, []); // eslint-disable-line

  async function togglePref(key: keyof NotificationPrefs) {
    if (!memberId) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setPrefsSaving(true);
    await supabase
      .from('members')
      .update({ notification_preferences: updated })
      .eq('id', memberId);
    setPrefsSaving(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">General</h1>
      <p className="text-sm text-gray-500 mb-8">Manage your workspace settings.</p>

      {!canManage && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl mb-6">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          You have read-only access. Only admins and owners can edit workspace settings.
        </div>
      )}

      <div className="space-y-6">
        {/* Workspace info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Workspace details</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Workspace name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!canManage}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              />
            </div>
            {canManage && (
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="bg-[#ff724f] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#e8603a] transition-colors"
                >
                  {saved ? '✓ Saved' : 'Save changes'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Notifications */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Email notifications</h2>
          <p className="text-xs text-gray-400 mb-4">Choose which emails you want to receive.</p>
          <div className="space-y-4">
            <NotificationToggle
              label="New feedback submitted"
              description="Get notified when a new feedback is submitted to any project."
              enabled={prefs.new_feedback}
              saving={prefsSaving}
              onChange={() => togglePref('new_feedback')}
            />
            <NotificationToggle
              label="Status changes"
              description="Get notified when a feedback status is updated."
              enabled={prefs.status_change}
              saving={prefsSaving}
              onChange={() => togglePref('status_change')}
            />
            <NotificationToggle
              label="New comments"
              description="Get notified when someone comments on a feedback item."
              enabled={prefs.comments}
              saving={prefsSaving}
              onChange={() => togglePref('comments')}
            />
          </div>
        </div>

        {/* Danger zone — admin/owner only */}
        {canManage && (
          <div className="bg-white border border-red-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-red-700 mb-1">Delete workspace</h2>
            <p className="text-sm text-gray-500 mb-4">
              Permanently delete this workspace and all projects, feedback, and data. This action cannot be undone.
            </p>
            <button className="text-sm font-medium text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
              Delete workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
