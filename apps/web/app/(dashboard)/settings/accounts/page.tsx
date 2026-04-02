'use client';

import { useState } from 'react';

const PROVIDERS = [
  {
    id: 'google',
    label: 'Google',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    connected: false,
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    ),
    connected: false,
  },
];

export default function AccountsPage() {
  const [providers, setProviders] = useState(PROVIDERS);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');

  function toggleProvider(id: string) {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, connected: !p.connected } : p))
    );
  }

  function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    setPwSaved(true);
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setTimeout(() => setPwSaved(false), 2000);
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Accounts</h1>
      <p className="text-sm text-gray-500 mb-8">Manage connected accounts and password.</p>

      <div className="space-y-6">
        {/* Connected accounts */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Connected accounts</h2>
          <div className="space-y-3">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center gap-4 py-2">
                <div className="text-gray-700">{p.icon}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{p.label}</div>
                  <div className="text-xs text-gray-400">
                    {p.connected ? 'Connected' : 'Not connected'}
                  </div>
                </div>
                <button
                  onClick={() => toggleProvider(p.id)}
                  className={`text-sm font-medium px-4 py-1.5 rounded-lg border transition-colors ${
                    p.connected
                      ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      : 'border-[#ff724f]/30 text-[#ff724f] hover:bg-[#fff3f0]'
                  }`}
                >
                  {p.connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Change password */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Change password</h2>
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Current password</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">New password</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm new password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
              />
            </div>
            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="bg-[#ff724f] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#e8603a] transition-colors"
              >
                {pwSaved ? '✓ Updated' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
