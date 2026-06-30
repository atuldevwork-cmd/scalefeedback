import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // next from query param (email login flow)
  // fallback to cookie (Google OAuth flow — Supabase strips query params from redirectTo)
  const rawQueryNext = searchParams.get('next') ?? '';
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookieNext = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('auth_next='))
    ?.split('=')
    .slice(1)
    .join('=') ?? '';

  const rawNext = rawQueryNext || decodeURIComponent(cookieNext);
  // must start with / to prevent open redirect
  const next = rawNext.startsWith('/') ? rawNext : '/projects';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const appHost = process.env.NEXT_PUBLIC_APP_HOST;
      const appOrigin = appHost ? `https://${appHost}` : origin;
      const response = NextResponse.redirect(`${appOrigin}${next}`);
      response.cookies.set('auth_next', '', { maxAge: 0, path: '/' });
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
