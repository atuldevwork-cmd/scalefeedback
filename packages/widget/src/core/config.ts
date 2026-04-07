import type { WidgetConfig } from '../types';

function getScriptTag(): HTMLScriptElement {
  const script =
    (document.currentScript as HTMLScriptElement | null) ??
    (document.querySelector('script[data-project]') as HTMLScriptElement | null);

  if (!script) throw new Error('[ScaleFeedback] Could not find widget script tag.');
  return script;
}

export async function parseConfig(): Promise<WidgetConfig> {
  const script = getScriptTag();

  const projectApiKey = script.dataset['project'] ?? '';
  if (!projectApiKey) throw new Error('[ScaleFeedback] Missing data-project attribute.');

  const apiBaseUrl = script.dataset['api'] ?? (script.src ? new URL(script.src).origin : window.location.origin);

  // Fetch config from dashboard — changes in project settings auto-apply
  try {
    const res = await fetch(`${apiBaseUrl}/api/widget-config?key=${projectApiKey}`);
    if (res.ok) {
      const remote = await res.json();
      return {
        projectApiKey,
        apiBaseUrl,
        color:          remote.color          ?? '#7C3AED',
        position:       remote.position       ?? 'bottom-right',
        buttonText:     remote.buttonText      ?? 'Report issue',
        guestReporting: remote.guestReporting ?? true,
        collectConsole: remote.collectConsole ?? true,
        collectNetwork: remote.collectNetwork ?? false,
        audience:         remote.audience         ?? 'everyone',
        pages:            remote.pages            ?? 'all',
        secretParamType:  remote.secretParamType  ?? 'default',
        secretParam:      remote.secretParam      ?? '',
      };
    }
  } catch {
    // fall through to script-tag fallback
  }

  // Fallback: read from script tag attributes (backwards compat)
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
  };
}
