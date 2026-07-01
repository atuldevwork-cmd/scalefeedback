'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function getNext() {
    return new URLSearchParams(window.location.search).get('next') ?? '';
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      const next = getNext();
      window.location.href = next || '/projects';
    }
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    const next = getNext();
    if (next) {
      document.cookie = `auth_next=${encodeURIComponent(next)}; path=/; max-age=300; SameSite=Lax`;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-[#111111] p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#ff724f] rounded-xl flex items-center justify-center font-bold text-white text-sm">P</div>
          <span className="font-bold text-white text-lg font-heading">Pinmarks</span>
        </div>
        <div className="space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-[#ff724f]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#ff724f] text-[24px]">screenshot_monitor</span>
          </div>
          <blockquote className="space-y-2">
            <p className="text-white/90 text-lg font-medium leading-snug font-heading">
              &ldquo;Collect, annotate, and manage visual feedback from any website — all in one place.&rdquo;
            </p>
            <p className="text-white/40 text-sm">Pinmarks</p>
          </blockquote>
          <div className="flex gap-3">
            {['Screenshots', 'Annotations', 'Team Workflows'].map((tag) => (
              <span key={tag} className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/10 text-white/60">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <p className="text-white/25 text-xs" suppressHydrationWarning>&copy; {new Date().getFullYear()} Pinmarks. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#f9f9fb]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-[#ff724f] rounded-lg flex items-center justify-center font-bold text-white text-sm">P</div>
            <span className="font-bold text-[#111111] text-lg font-heading">Pinmarks</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#111111] font-heading">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your Pinmarks account</p>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-6 space-y-5 border border-gray-100">
            {/* Google */}
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs text-gray-400">
                <span className="bg-white px-3">or with email</span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
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

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
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
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#ff724f] font-semibold hover:text-[#e8603a]">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
