import type { WidgetConfig } from '../types';

export function parseConfig(): WidgetConfig {
  // Find this script tag
  const script =
    document.currentScript as HTMLScriptElement | null ??
    document.querySelector('script[data-project]') as HTMLScriptElement | null;

  if (!script) {
    throw new Error('[ScaleFeedback] Could not find widget script tag.');
  }

  const projectApiKey = script.dataset['project'] ?? '';
  if (!projectApiKey) {
    throw new Error('[ScaleFeedback] Missing data-project attribute.');
  }

  return {
    projectApiKey,
    position: (script.dataset['position'] as WidgetConfig['position']) ?? 'bottom-right',
    color: script.dataset['color'] ?? '#7C3AED',
    guestReporting: script.dataset['guest'] !== 'false',
    collectConsole: script.dataset['console'] !== 'false',
    collectNetwork: script.dataset['network'] === 'true',
    apiBaseUrl: script.dataset['api'] ?? (script.src ? new URL(script.src).origin : window.location.origin),
  };
}
