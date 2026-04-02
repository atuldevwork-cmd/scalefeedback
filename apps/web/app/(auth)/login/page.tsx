'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function ScaleStationMark() {
  return (
    <svg width="44" height="17" viewBox="0 0 67 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M52.6249 20.8102C55.174 20.8102 57.2471 18.7396 57.2471 16.1792C57.2471 13.6187 55.1805 11.5482 52.6249 11.5482C50.0693 11.5482 48.0026 13.6187 48.0026 16.1792C48.0026 18.7396 50.0693 20.8102 52.6249 20.8102ZM52.6249 14.0825C53.7853 14.0825 54.7176 15.0231 54.7176 16.1792C54.7176 17.3353 53.7788 18.2759 52.6249 18.2759C51.4709 18.2759 50.5321 17.3353 50.5321 16.1792C50.5321 15.0231 51.4709 14.0825 52.6249 14.0825ZM60.6959 13.1093C61.2501 13.5926 62.065 13.5926 62.6191 13.1093C64.2164 11.731 67.2479 8.70684 67.2479 5.59772C67.2479 2.4886 64.7445 0 61.6608 0C58.5771 0 56.0736 2.5082 56.0736 5.59772C56.0736 8.68725 59.1052 11.718 60.7024 13.1093H60.6959ZM58.5901 5.59772C58.5901 3.89946 59.9592 2.52779 61.6543 2.52779C63.3493 2.52779 64.7184 3.89946 64.7184 5.59772C64.7184 7.29598 63.3493 8.66765 61.6543 8.66765C59.9592 8.66765 58.5901 7.29598 58.5901 5.59772ZM52.6184 27.1525C50.0693 27.1525 47.9961 29.2231 47.9961 31.7836C47.9961 34.344 50.0627 36.4146 52.6184 36.4146C55.174 36.4146 57.2406 34.344 57.2406 31.7836C57.2406 29.2231 55.174 27.1525 52.6184 27.1525ZM52.6184 33.8803C51.4579 33.8803 50.5256 32.9397 50.5256 31.7836C50.5256 30.6274 51.4644 29.6869 52.6184 29.6869C53.7723 29.6869 54.7111 30.6274 54.7111 31.7836C54.7111 32.9397 53.7723 33.8803 52.6184 33.8803ZM60.6829 19.3536C58.1338 19.3536 56.0606 21.4242 56.0606 23.9846C56.0606 26.5451 58.1273 28.6157 60.6829 28.6157C63.2385 28.6157 65.3051 26.5451 65.3051 23.9846C65.3051 21.4242 63.2385 19.3536 60.6829 19.3536ZM60.6829 26.0813C59.5224 26.0813 58.5901 25.1408 58.5901 23.9846C58.5901 22.8285 59.5289 21.8879 60.6829 21.8879C61.8368 21.8879 62.7756 22.8285 62.7756 23.9846C62.7756 25.1408 61.8368 26.0813 60.6829 26.0813Z" fill="#FF724F"/>
    </svg>
  );
}

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
    // Store next in a cookie — Supabase strips query params from redirectTo
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
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-[#300a46] p-12">
        <div>
          <div className="flex items-center gap-3">
            <ScaleStationMark />
            <div>
              <p className="text-white font-semibold text-sm leading-none font-heading">ScaleStation</p>
              <p className="text-[#ff724f] text-[10px] font-semibold tracking-widest uppercase">Feedback</p>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-[#ff724f]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#ff724f] text-[24px]">screenshot_monitor</span>
          </div>
          <blockquote className="space-y-2">
            <p className="text-white/90 text-lg font-medium leading-snug font-heading">
              &ldquo;Collect, annotate, and manage visual feedback from any website — all in one place.&rdquo;
            </p>
            <p className="text-white/40 text-sm">ScaleFeedback by ScaleStation</p>
          </blockquote>
          <div className="flex gap-3">
            {['Screenshots', 'Annotations', 'Team Workflows'].map((tag) => (
              <span key={tag} className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/10 text-white/60">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <p className="text-white/25 text-xs" suppressHydrationWarning>&copy; {new Date().getFullYear()} ScaleStation. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#f9f9fb]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <ScaleStationMark />
            <div>
              <p className="text-[#300a46] font-semibold text-sm font-heading">ScaleStation</p>
              <p className="text-[#ff724f] text-[10px] font-semibold tracking-widest uppercase">Feedback</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#300a46] font-heading">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your ScaleFeedback account</p>
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
