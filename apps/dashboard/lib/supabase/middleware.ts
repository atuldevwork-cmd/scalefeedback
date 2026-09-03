import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/auth', '/join', '/guest', '/api/feedback', '/api/auth/me', '/api/widget-config', '/api/widget-session', '/api/render-snapshot', '/api/share-snapshot', '/api/ai-rewrite', '/s', '/widget.js', '/guest/join'];

// API routes called cross-origin from customer websites
const CORS_PATHS = ['/api/widget-config', '/api/feedback', '/api/render-snapshot', '/api/share-snapshot', '/api/ai-rewrite'] as const;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Set a SameSite=None; Secure cookie so the widget-session iframe can read the
  // session token cross-origin. Regular Supabase cookies are SameSite=Lax and are
  // blocked by Chrome's Storage Partitioning in third-party iframes — SameSite=None
  // is the only mechanism that bypasses this restriction.
  if (user) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      supabaseResponse.cookies.set('sf-wt', session.access_token, {
        sameSite: 'none',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60, // 1 hour — matches Supabase JWT expiry
      });
    }
  } else {
    supabaseResponse.cookies.delete('sf-wt');
  }

  const isPublic = PUBLIC_PATHS.some((p) =>
    p === '/' ? request.nextUrl.pathname === '/' : request.nextUrl.pathname.startsWith(p)
  );
  const needsCors = CORS_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  // Handle CORS preflight for cross-origin API routes
  if (needsCors && request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const next = request.nextUrl.searchParams.get('next');
    if (next) {
      // next may include its own query string (e.g. /guest/join?s=xxx) — use href directly
      const dest = new URL(next, request.nextUrl.origin);
      return NextResponse.redirect(dest);
    }
    const url = request.nextUrl.clone();
    url.pathname = '/projects';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (needsCors) {
    supabaseResponse.headers.set('Access-Control-Allow-Origin', '*');
    supabaseResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    supabaseResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return supabaseResponse;
}
