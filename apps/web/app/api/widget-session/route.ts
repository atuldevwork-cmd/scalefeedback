import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This endpoint returns a minimal HTML page loaded as a hidden iframe on any
// external website that embeds the ScaleFeedback widget.
//
// TWO-LAYER approach to get the auth token:
//
// 1. SERVER-SIDE (cookies): Works when the iframe is same-origin or the cookies
//    have SameSite=None — e.g. local dev where demo.html is on localhost:3000.
//    The Next.js server reads the Supabase session from the request cookies and
//    inlines the token directly into the HTML.
//
// 2. CLIENT-SIDE (localStorage): Works for cross-origin iframes on external sites
//    (e.g. HubSpot) because the iframe runs in the ScaleFeedback origin context.
//    @supabase/ssr's createBrowserClient writes the session to localStorage in
//    addition to cookies, so the iframe script can read it from there.

export async function GET() {
  // Layer 1: try to get token server-side from cookies
  let serverToken: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    serverToken = session?.access_token ?? null;
  } catch {
    // cookies unavailable or session invalid — will fall through to client-side
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
(function () {
  // Layer 1: server already resolved the token from cookies (same-origin iframes)
  var token = ${JSON.stringify(serverToken)};
  if (token) {
    window.parent.postMessage({ type: 'sf-session', token: token }, '*');
    return;
  }

  // Layer 2: read sf-widget-token from localStorage.
  // @supabase/ssr uses cookie-based storage (not localStorage), so we bridge
  // this with WidgetTokenSync — a client component that runs in the ScaleFeedback
  // dashboard and saves the access token to localStorage whenever it changes.
  // The iframe runs on the ScaleFeedback origin, so it can read this key.
  try {
    token = localStorage.getItem('sf-widget-token') || null;
  } catch (e) { /* localStorage unavailable (strict mode / Firefox tracking protection) */ }

  window.parent.postMessage({ type: 'sf-session', token: token }, '*');
})();
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Allow embedding as iframe from any origin
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *",
      'Cache-Control': 'no-store',
    },
  });
}
