import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email';

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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data.user;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('welcome_email_sent_at, full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (profile && !profile.welcome_email_sent_at && user.email) {
          await sendWelcomeEmail({
            to: user.email,
            name: profile.full_name ?? user.user_metadata?.full_name ?? null,
            dashboardUrl: `${origin}/projects`,
          });
          await supabase
            .from('profiles')
            .update({ welcome_email_sent_at: new Date().toISOString() })
            .eq('id', user.id);
        }
      }

      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.set('auth_next', '', { maxAge: 0, path: '/' });
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
