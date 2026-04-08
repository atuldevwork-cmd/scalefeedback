import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This endpoint returns a minimal HTML page loaded as a hidden iframe on any
// external website that embeds the ScaleFeedback widget.
// Because the iframe is served from the ScaleFeedback origin, the Next.js
// server can read the user's session from their cookies and embed the access
// token directly in the response — solving the cross-origin localStorage/cookie
// restriction without any client-side storage access.

export async function GET() {
  let token: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token ?? null;
  } catch {
    // If auth check fails, continue with null token (widget shows name/email fields)
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
window.parent.postMessage({ type: 'sf-session', token: ${JSON.stringify(token)} }, '*');
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
