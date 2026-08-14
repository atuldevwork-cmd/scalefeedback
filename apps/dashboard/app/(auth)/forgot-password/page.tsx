'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');

    const supabase = createClient();
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/reset-password')}`;
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-6 py-12 bg-[#f9f9fb] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-[#ff724f]/20 blur-[120px]" />
          <div className="absolute -bottom-40 -right-32 w-[32rem] h-[32rem] rounded-full bg-[#300a46]/15 blur-[120px]" />
        </div>
        <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-card border border-gray-100 p-10 w-full max-w-md text-center">
          <div className="w-14 h-14 bg-green-50 rounded-2xl mx-auto mb-5 flex items-center justify-center">
            <span className="material-symbols-outlined text-green-600 text-[28px]">mark_email_read</span>
          </div>
          <h1 className="text-xl font-bold text-[#111111] mb-2 font-heading">Check your inbox</h1>
          <p className="text-gray-500 text-sm">
            We sent a password reset link to <strong className="text-gray-700">{email}</strong>. Click it to choose a new password.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-[#ff724f] font-semibold hover:text-[#e8603a]"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to login
          </Link>
        </div>
      </div>
    );
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
          <h1 className="text-2xl font-bold text-[#111111] font-heading">Forgot password?</h1>
          <p className="text-gray-500 text-sm mt-1">We&apos;ll email you a link to reset it</p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-card p-6 space-y-5 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all"
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
              {loading ? 'Sending link…' : 'Send reset link'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Remembered it?{' '}
          <Link href="/login" className="text-[#ff724f] font-semibold hover:text-[#e8603a]">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
