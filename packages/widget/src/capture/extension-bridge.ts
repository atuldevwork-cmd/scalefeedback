// Page-side RPC client for the companion Pinmarks browser extension.
// Talks only via window.postMessage — the extension's content script (isolated
// JS world, but sharing this window's DOM event target) relays messages to/from
// its background service worker. See packages/extension/src/content-script.ts.

const WIDGET_SOURCE = 'pinmarks-widget' as const;
const EXTENSION_SOURCE = 'pinmarks-extension' as const;
const DETECT_TIMEOUT_MS = 250;
const CAPTURE_TIMEOUT_MS = 20_000;

type RequestType = 'PING' | 'CAPTURE_VIEWPORT' | 'CAPTURE_FULL_PAGE';
type ResponseType = 'PONG' | 'CAPTURE_VIEWPORT_RESULT' | 'CAPTURE_FULL_PAGE_RESULT';

interface ResponseMessage {
  source: typeof EXTENSION_SOURCE;
  type: ResponseType;
  requestId: string;
  version?: string;
  dataUrl?: string;
  error?: string;
}

function isResponseMessage(data: unknown, requestId: string, type: ResponseType): data is ResponseMessage {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return d.source === EXTENSION_SOURCE && d.type === type && d.requestId === requestId;
}

function sendRequest(type: RequestType, timeoutMs: number): Promise<ResponseMessage> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const responseType = (
      { PING: 'PONG', CAPTURE_VIEWPORT: 'CAPTURE_VIEWPORT_RESULT', CAPTURE_FULL_PAGE: 'CAPTURE_FULL_PAGE_RESULT' } as const
    )[type];

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Extension did not respond to ${type} within ${timeoutMs}ms`));
    }, timeoutMs);

    function onMessage(e: MessageEvent) {
      if (e.source !== window) return; // ignore messages from other frames/windows
      if (!isResponseMessage(e.data, requestId, responseType)) return;
      cleanup();
      resolve(e.data);
    }
    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    }

    window.addEventListener('message', onMessage);
    window.postMessage({ source: WIDGET_SOURCE, type, requestId }, window.location.origin);
  });
}

export async function detectExtension(): Promise<{ installed: boolean; version?: string }> {
  try {
    const res = await sendRequest('PING', DETECT_TIMEOUT_MS);
    return { installed: true, version: res.version };
  } catch {
    return { installed: false };
  }
}

async function captureVia(type: 'CAPTURE_VIEWPORT' | 'CAPTURE_FULL_PAGE'): Promise<string> {
  const res = await sendRequest(type, CAPTURE_TIMEOUT_MS);
  if (res.error || !res.dataUrl) throw new Error(res.error || 'Extension returned no screenshot data');
  return res.dataUrl;
}

export function captureViewportViaExtension(): Promise<string> {
  return captureVia('CAPTURE_VIEWPORT');
}

export function captureFullPageViaExtension(): Promise<string> {
  return captureVia('CAPTURE_FULL_PAGE');
}
