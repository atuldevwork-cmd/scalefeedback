import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const MARKETING_HOST = process.env.NEXT_PUBLIC_MARKETING_HOST;
const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST;

// Paths that live exclusively on the app (dashboard) host
const DASHBOARD_PATHS = ['/projects', '/settings', '/docs', '/notifications', '/support', '/no-access', '/login', '/signup', '/widget.js'];

// Marketing-only paths — redirected to marketing host when accessed on app host
const MARKETING_ONLY_PATHS = ['/pricing', '/contact', '/about'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = (request.headers.get('host') || '').split(':')[0];

  if (MARKETING_HOST && APP_HOST) {
    const isMarketingHost = hostname === MARKETING_HOST;
    const isAppHost = hostname === APP_HOST;

    if (isMarketingHost) {
      // Dashboard routes on the marketing host → redirect to app host
      if (DASHBOARD_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
        const url = new URL(request.url);
        url.host = APP_HOST;
        return NextResponse.redirect(url.toString(), 308);
      }
    }

    if (isAppHost) {
      // Root on the app host → go straight to /projects
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/projects', request.url));
      }

      // Marketing-only pages on the app host → redirect to marketing host
      if (MARKETING_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
        const url = new URL(request.url);
        url.host = MARKETING_HOST;
        return NextResponse.redirect(url.toString(), 308);
      }
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
