'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Syncs the Supabase access token to localStorage under 'sf-widget-token'.
 * This allows the widget-session iframe (which runs on the ScaleFeedback origin)
 * to read the token cross-origin and auto-identify logged-in users in the widget.
 *
 * @supabase/ssr uses cookie-based storage, so the token is not in localStorage
 * by default — this component bridges that gap.
 */
export function WidgetTokenSync() {
  useEffect(() => {
    const supabase = createClient();

    // Sync immediately for the current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        localStorage.setItem('sf-widget-token', session.access_token);
      } else {
        localStorage.removeItem('sf-widget-token');
      }
    });

    // Keep in sync on sign-in / sign-out / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        localStorage.setItem('sf-widget-token', session.access_token);
      } else {
        localStorage.removeItem('sf-widget-token');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
