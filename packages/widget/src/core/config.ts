import type { WidgetConfig } from '../types';

function getScriptTag(): HTMLScriptElement {
  const script =
    (document.currentScript as HTMLScriptElement | null) ??
    (document.querySelector('script[data-project]') as HTMLScriptElement | null);

  if (!script) throw new Error('[Pinmarks] Could not find widget script tag.');
  return script;
}

/**
 * Get the Supabase auth token via a hidden iframe served from the Pinmarks
 * origin. This solves the cross-origin localStorage restriction — the iframe
 * runs in the Pinmarks origin context, reads its own localStorage, and
 * posts the token back via postMessage.
 */
function getTokenViaIframe(apiBaseUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    // Timeout after 5 s — if the iframe doesn't respond, continue without auth
    const timer = setTimeout(() => {
      cleanup(); resolve(null);
    }, 5000);

    const iframe = document.createElement('iframe');
    iframe.src = `${apiBaseUrl}/api/widget-session`;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;border:none;top:-9999px;left:-9999px;';

    iframe.onerror = () => { cleanup(); resolve(null); };

    function onMessage(ev: MessageEvent) {
      if (ev.data?.type === 'sf-session') {
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
  if (!projectApiKey) throw new Error('[Pinmarks] Missing data-project attribute.');

  const apiBaseUrl = script.dataset['api'] ?? (script.src ? new URL(script.src).origin : window.location.origin);

  // Read optional pre-identified reporter from host-page config
  const hostCfg = (window as unknown as { PinmarksConfig?: Record<string, unknown> }).PinmarksConfig ?? {};
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
      }

      return {
        projectApiKey,
        apiBaseUrl,
        color:           remote.color           ?? '#7C3AED',
        position:        remote.position        ?? 'middle-right',
        buttonText:      remote.buttonText      ?? 'Report issue',
        guestReporting:  remote.guestReporting  ?? true,
        collectConsole:  remote.collectConsole  ?? true,
        collectNetwork:  remote.collectNetwork  ?? false,
        audience:        remote.audience        ?? 'everyone',
        pages:           remote.pages           ?? 'all',
        secretParamType: remote.secretParamType ?? 'default',
        secretParam:     remote.secretParam     ?? '',
        sessionReplay:   remote.sessionReplay   ?? false,
        aiRewrite:       remote.aiRewrite       ?? false,
        titleGeneration: remote.aiTitleGeneration ?? false,
        guestFormTypes:  remote.guestFormTypes,
        memberFormTypes: remote.memberFormTypes,
        guestFormFields:  remote.guestFormFields,
        memberFormFields: remote.memberFormFields,
        assignableMembers: remote.assignableMembers,
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
    position:       (script.dataset['position'] as WidgetConfig['position']) ?? 'middle-right',
    buttonText:     script.dataset['text']     ?? 'Report issue',
    guestReporting: script.dataset['guest']    !== 'false',
    collectConsole: script.dataset['console']  !== 'false',
    collectNetwork: script.dataset['network']  === 'true',
    audience:       'everyone',
    pages:          'all',
    user:           presetUser,
  };
}
