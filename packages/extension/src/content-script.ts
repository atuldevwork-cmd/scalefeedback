// Bridges the page's window.postMessage RPC (packages/widget/src/capture/extension-bridge.ts)
// to this extension's background service worker via chrome.runtime.
import {
  WIDGET_SOURCE,
  EXTENSION_SOURCE,
  type PageRequestMessage,
  type ExtensionResponseMessage,
  type BackgroundResponse,
} from './shared/messages';

function isPageRequest(data: unknown): data is PageRequestMessage {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return d.source === WIDGET_SOURCE && typeof d.type === 'string' && typeof d.requestId === 'string';
}

function reply(requestId: string, patch: Partial<ExtensionResponseMessage>, type: ExtensionResponseMessage['type']) {
  const msg: ExtensionResponseMessage = { source: EXTENSION_SOURCE, type, requestId, ...patch };
  window.postMessage(msg, window.location.origin);
}

window.addEventListener('message', (e: MessageEvent) => {
  if (e.source !== window) return; // only trust messages from this same window
  if (!isPageRequest(e.data)) return;
  const { type, requestId } = e.data;

  if (type === 'PING') {
    reply(requestId, { version: chrome.runtime.getManifest().version }, 'PONG');
    return;
  }

  if (type === 'CAPTURE_VIEWPORT' || type === 'CAPTURE_FULL_PAGE') {
    const responseType = type === 'CAPTURE_VIEWPORT' ? 'CAPTURE_VIEWPORT_RESULT' : 'CAPTURE_FULL_PAGE_RESULT';
    chrome.runtime.sendMessage({ type }, (res: BackgroundResponse | undefined) => {
      if (chrome.runtime.lastError) {
        reply(requestId, { error: chrome.runtime.lastError.message }, responseType);
        return;
      }
      if (!res || !res.ok) {
        reply(requestId, { error: res?.error ?? 'No response from background' }, responseType);
        return;
      }
      reply(requestId, { dataUrl: res.dataUrl }, responseType);
    });
  }
});
