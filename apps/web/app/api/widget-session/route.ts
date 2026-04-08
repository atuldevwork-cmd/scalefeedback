import { type NextRequest, NextResponse } from 'next/server';

// This endpoint returns a minimal HTML page loaded as a hidden iframe on any
// external website that embeds the ScaleFeedback widget.
//
// THREE-LAYER approach to get the auth token:
//
// 1. SameSite=None cookie (sf-wt): Set by the middleware when the user is logged
//    in on ScaleFeedback. Because it's SameSite=None; Secure, browsers send it
//    even in cross-origin iframe requests — this is the only mechanism that
//    bypasses Chrome's Storage Partitioning for third-party iframes.
//
// 2. Server-side session (cookies): Works when the iframe is same-origin
//    (e.g. local dev where demo.html is on localhost:3000).
//
// 3. localStorage (sf-widget-token): Fallback for browsers without storage
//    partitioning (older browsers / non-Chrome).

export async function GET(req: NextRequest) {
  // Layer 1: read the dedicated cross-origin widget token cookie (SameSite=None)
  const serverToken = req.cookies.get('sf-wt')?.value ?? null;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
(function () {
  // Layer 1: SameSite=None cookie was read server-side and inlined here
  var token = ${JSON.stringify(serverToken)};
  if (token) {
    window.parent.postMessage({ type: 'sf-session', token: token }, '*');
    return;
  }

  // Layer 3: localStorage fallback (works on older browsers without storage partitioning)
  try {
    token = localStorage.getItem('sf-widget-token') || null;
  } catch (e) { /* localStorage unavailable */ }

  window.parent.postMessage({ type: 'sf-session', token: token }, '*');
})();
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *",
      'Cache-Control': 'no-store',
    },
  });
}
