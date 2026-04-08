import type { WidgetConfig } from '../types';

function getScriptTag(): HTMLScriptElement {
  const script =
    (document.currentScript as HTMLScriptElement | null) ??
    (document.querySelector('script[data-project]') as HTMLScriptElement | null);

  if (!script) throw new Error('[ScaleFeedback] Could not find widget script tag.');
  return script;
}

/**
 * Get the Supabase auth token via a hidden iframe served from the ScaleFeedback
 * origin. This solves the cross-origin localStorage restriction — the iframe
 * runs in the ScaleFeedback origin context, reads its own localStorage, and
 * posts the token back via postMessage.
 */
function getTokenViaIframe(apiBaseUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    console.log('[ScaleFeedback] Starting session bridge iframe →', `${apiBaseUrl}/api/widget-session`);

    // Timeout after 5 s — if the iframe doesn't respond, continue without auth
    const timer = setTimeout(() => {
      console.warn('[ScaleFeedback] Session bridge timed out — iframe may be blocked by page CSP');
      cleanup(); resolve(null);
    }, 5000);

    const iframe = document.createElement('iframe');
    iframe.src = `${apiBaseUrl}/api/widget-session`;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;border:none;top:-9999px;left:-9999px;';

    iframe.onerror = () => {
      console.error('[ScaleFeedback] Session bridge iframe failed to load');
      cleanup(); resolve(null);
    };

    function onMessage(ev: MessageEvent) {
      if (ev.data?.type === 'sf-session') {
        console.log('[ScaleFeedback] Session bridge received token:', ev.data.token ? 'found' : 'null');
        cleanup();
        resolve((ev.data.token as string | null) ?? null);
      }
    }

    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      try { document.body.removeChild(iframe); } catch { /* already removed */ }
    }

    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
  });
}

export async function parseConfig(): Promise<WidgetConfig> {
  const script = getScriptTag();

  const projectApiKey = script.dataset['project'] ?? '';
  if (!projectApiKey) throw new Error('[ScaleFeedback] Missing data-project attribute.');

  const apiBaseUrl = script.dataset['api'] ?? (script.src ? new URL(script.src).origin : window.location.origin);

  // Read optional pre-identified reporter from host-page config
  const hostCfg = (window as unknown as { ScaleFeedbackConfig?: Record<string, unknown> }).ScaleFeedbackConfig ?? {};
  const hostReporterName  = hostCfg['reporterName']  as string | undefined;
  const hostReporterEmail = hostCfg['reporterEmail'] as string | undefined;
  const hostUser = hostCfg['user'] as { name: string; email: string } | undefined;

  let presetUser: WidgetConfig['user'] =
    hostUser ??
    (hostReporterName && hostReporterEmail
      ? { name: hostReporterName, email: hostReporterEmail }
      : undefined);

  // Get auth token via iframe bridge (works cross-origin)
  const token = await getTokenViaIframe(apiBaseUrl);

  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${apiBaseUrl}/api/widget-config?key=${projectApiKey}`, { headers });
    if (res.ok) {
      const remote = await res.json();

      // If the API returned a logged-in user, it overrides everything
      if (remote.user?.name && remote.user?.email) {
        presetUser = remote.user as { name: string; email: string };
        console.log('[ScaleFeedback] User auto-identified:', remote.user.email);
      } else {
        console.log('[ScaleFeedback] No logged-in user returned from config API');
      }

      return {
        projectApiKey,
        apiBaseUrl,
        color:           remote.color           ?? '#7C3AED',
        position:        remote.position        ?? 'bottom-right',
        buttonText:      remote.buttonText      ?? 'Report issue',
        guestReporting:  remote.guestReporting  ?? true,
        collectConsole:  remote.collectConsole  ?? true,
        collectNetwork:  remote.collectNetwork  ?? false,
        audience:        remote.audience        ?? 'everyone',
        pages:           remote.pages           ?? 'all',
        secretParamType: remote.secretParamType ?? 'default',
        secretParam:     remote.secretParam     ?? '',
        user:            presetUser,
      };
    }
  } catch {
    // fall through to script-tag fallback
  }

  // Fallback: read from script tag attributes
  return {
    projectApiKey,
    apiBaseUrl,
    color:          script.dataset['color']    ?? '#7C3AED',
    position:       (script.dataset['position'] as WidgetConfig['position']) ?? 'bottom-right',
    buttonText:     script.dataset['text']     ?? 'Report issue',
    guestReporting: script.dataset['guest']    !== 'false',
    collectConsole: script.dataset['console']  !== 'false',
    collectNetwork: script.dataset['network']  === 'true',
    audience:       'everyone',
    pages:          'all',
    user:           presetUser,
  };
}
