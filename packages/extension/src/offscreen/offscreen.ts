// MV3 service workers have no DOM/canvas access, so all frame compositing for
// full-page (scroll + stitch) capture happens here, in this Chrome-owned,
// page-isolated offscreen document — never in the customer page's own DOM,
// which would reintroduce the "arbitrary page CSS/JS interferes with our
// injected canvas" fragility this whole capture rewrite exists to escape.
import type { OffscreenMessage, OffscreenResponse } from '../shared/messages';

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode captured frame'));
    img.src = src;
  });
}

chrome.runtime.onMessage.addListener((msg: OffscreenMessage, _sender, sendResponse) => {
  if (msg.target !== 'offscreen') return;

  if (msg.type === 'STITCH_RESET') {
    canvas = document.createElement('canvas');
    canvas.width = msg.totalWidthPx;
    canvas.height = msg.totalHeightPx;
    ctx = canvas.getContext('2d');
    const res: OffscreenResponse = ctx ? { ok: true } : { ok: false, error: '2D canvas context unavailable' };
    sendResponse(res);
    return;
  }

  if (msg.type === 'STITCH_ADD_FRAME') {
    (async () => {
      try {
        if (!ctx) throw new Error('Offscreen canvas not initialized (missing STITCH_RESET)');
        const img = await loadImage(msg.dataUrl);
        ctx.drawImage(img, 0, msg.yPx);
        sendResponse({ ok: true } as OffscreenResponse);
      } catch (err) {
        sendResponse({ ok: false, error: String(err) } as OffscreenResponse);
      }
    })();
    return true; // keep the message channel open for the async response above
  }

  if (msg.type === 'STITCH_FINALIZE') {
    try {
      if (!canvas) throw new Error('Offscreen canvas not initialized');
      const dataUrl = canvas.toDataURL('image/png');
      canvas = null;
      ctx = null;
      sendResponse({ ok: true, dataUrl } as OffscreenResponse);
    } catch (err) {
      sendResponse({ ok: false, error: String(err) } as OffscreenResponse);
    }
    return;
  }
});
