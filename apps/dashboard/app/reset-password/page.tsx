'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PasswordInput } from '@/components/ui/password-input';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !confirmPassword) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/projects';
      }, 1500);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-12 bg-[#f9f9fb] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-[#ff724f]/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-32 w-[32rem] h-[32rem] rounded-full bg-[#300a46]/15 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-11 h-11 bg-[#ff724f] rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm">P</div>
          <span className="mt-3 font-bold text-[#111111] text-lg font-heading">Pinmarks</span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#111111] font-heading">Set a new password</h1>
          <p className="text-gray-500 text-sm mt-1">Choose something you haven&apos;t used before</p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-card p-6 space-y-5 border border-gray-100">
          {success ? (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg text-center">
              Password updated. Redirecting…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">New password</label>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Confirm password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm disabled:opacity-60 shadow-sm"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
