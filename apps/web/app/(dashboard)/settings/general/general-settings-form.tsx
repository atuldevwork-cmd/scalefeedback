'use client';

import { useState } from 'react';

function NotificationToggle({ label, description }: { label: string; description: string }) {
  const [enabled, setEnabled] = useState(true);
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-400">{description}</div>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
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
  const [orgSlug, setOrgSlug] = useState('scalestation');
  const [saved, setSaved] = useState(false);

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
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Workspace URL</label>
              <div className={`flex items-center border border-gray-200 rounded-lg overflow-hidden ${canManage ? 'focus-within:ring-2 focus-within:ring-[#ff724f]/30 focus-within:border-[#ff724f]' : 'bg-gray-50'}`}>
                <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 shrink-0">
                  scalefeedback.app/
                </span>
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  disabled={!canManage}
                  className="flex-1 px-3 py-2 text-sm focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Only lowercase letters, numbers, and hyphens.</p>
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
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Email notifications</h2>
          <div className="space-y-4">
            {[
              { id: 'new_feedback', label: 'New feedback submitted', description: 'Get notified when a new feedback is submitted to any project.' },
              { id: 'status_change', label: 'Status changes', description: 'Get notified when a feedback status is updated.' },
              { id: 'comments', label: 'New comments', description: 'Get notified when someone comments on a feedback item.' },
            ].map((item) => (
              <NotificationToggle key={item.id} label={item.label} description={item.description} />
            ))}
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
