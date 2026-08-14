import { snapshot } from 'rrweb-snapshot';
import { gzipToBase64 } from '../core/gzip';

export class SnapshotRenderUnavailable extends Error {
  constructor(reason: string) {
    super(`Server-side snapshot render unavailable: ${reason}`);
    this.name = 'SnapshotRenderUnavailable';
  }
}

// Serializes the live DOM (rrweb-snapshot — the same primitive already
// bundled for session replay) and ships it to our backend, which rebuilds it
// in a REAL browser (Puppeteer) and screenshots that. This is how marker.io's
// own default capture works: a real rendering engine has no DOM-reconstruction
// bugs (sticky positioning, unsupported CSS colors, etc.) the way html2canvas
// does, because it isn't reimplementing layout — it's just... a browser.
export async function captureViaServerRender(
  apiBaseUrl: string,
  projectApiKey: string,
  hideOwnUi: () => void,
  restoreOwnUi: () => void,
): Promise<string> {
  // snapshot() is synchronous — hide our own UI (widget host + loading
  // overlay) just for this call so neither ends up baked into the captured
  // pixels, then restore immediately so "Preparing…" stays visible to the
  // user for the actual network round-trip below.
  let tree;
  hideOwnUi();
  try {
    [tree] = snapshot(document, { inlineStylesheet: true });
  } finally {
    restoreOwnUi();
  }
  if (!tree) throw new SnapshotRenderUnavailable('DOM snapshot produced no tree');

  const domSnapshotGz = await gzipToBase64(tree);
  if (!domSnapshotGz) throw new SnapshotRenderUnavailable('CompressionStream unsupported in this browser');

  const response = await fetch(`${apiBaseUrl}/api/render-snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_api_key: projectApiKey,
      dom_snapshot_gz: domSnapshotGz,
      page_url: location.href,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      scroll_x: window.scrollX,
      scroll_y: window.scrollY,
      device_pixel_ratio: window.devicePixelRatio || 1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`render-snapshot request failed (${response.status}): ${errText}`);
  }

  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read rendered screenshot blob'));
    reader.readAsDataURL(blob);
  });
}
