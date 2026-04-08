import { NextResponse } from 'next/server';

// This endpoint returns a minimal HTML page that is loaded as a hidden iframe
// on any external website that embeds the ScaleFeedback widget.
// Because the iframe is served from the ScaleFeedback origin, it can read
// the Supabase auth token from localStorage and post it back to the parent
// window — solving the cross-origin localStorage restriction.

export async function GET() {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
(function () {
  var token = null;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        var raw = localStorage.getItem(key);
        if (raw) {
          var parsed = JSON.parse(raw);
          token = parsed.access_token
            || (parsed.session && parsed.session.access_token)
            || null;
          if (token) break;
        }
      }
    }
  } catch (e) { /* localStorage unavailable (e.g. strict mode) */ }
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
