import type { BackgroundResponse, OffscreenMessage, OffscreenResponse } from './shared/messages';
import {
  freezeStickyAndMeasure,
  scrollToStep,
  suppressStickyForNextFrames,
  restoreStickyAndScroll,
  type PageMeasurements,
} from './shared/capture-full-page';

// chrome.tabs.captureVisibleTab is rate-limited to 2 calls/second — every call
// site funnels through this throttle so the scroll-and-stitch loop in
// captureFullPage() never trips it.
const CAPTURE_MIN_INTERVAL_MS = 550;
const OFFSCREEN_URL = 'src/offscreen/offscreen.html';

let lastCaptureAt = 0;

async function captureVisibleTabThrottled(windowId: number): Promise<string> {
  const wait = CAPTURE_MIN_INTERVAL_MS - (Date.now() - lastCaptureAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastCaptureAt = Date.now();
  return chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
}

async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ['DOM_SCRAPING', 'BLOBS'] as chrome.offscreen.Reason[],
    justification: 'Composite scroll-captured viewport frames into one full-page screenshot image.',
  });
}

async function sendToOffscreen(msg: OffscreenMessage): Promise<Extract<OffscreenResponse, { ok: true }>> {
  const res = (await chrome.runtime.sendMessage(msg)) as OffscreenResponse | undefined;
  if (!res) throw new Error('Offscreen document did not respond');
  if (!res.ok) throw new Error(res.error);
  return res;
}

async function captureFullPage(tabId: number, windowId: number): Promise<string> {
  const [measureResult] = await chrome.scripting.executeScript({
    target: { tabId },
    func: freezeStickyAndMeasure,
  });
  const measurements = measureResult.result as PageMeasurements;
  const { totalHeightCss, viewportHeightCss, viewportWidthCss, dpr, originalScrollX, originalScrollY } = measurements;

  const steps: number[] = [];
  for (let y = 0; y < totalHeightCss - viewportHeightCss; y += viewportHeightCss) steps.push(y);
  steps.push(Math.max(0, totalHeightCss - viewportHeightCss)); // last step, clamped — flush with page bottom

  await ensureOffscreenDocument();
  try {
    await sendToOffscreen({
      target: 'offscreen',
      type: 'STITCH_RESET',
      totalWidthPx: Math.round(viewportWidthCss * dpr),
      totalHeightPx: Math.round(totalHeightCss * dpr),
    });

    for (let i = 0; i < steps.length; i++) {
      const [scrollResult] = await chrome.scripting.executeScript({
        target: { tabId },
        func: scrollToStep,
        args: [steps[i]],
      });
      const actualScrollY = scrollResult.result as number;

      if (i === 0) {
        // Frame 0 keeps sticky/fixed elements visible in their normal place;
        // suppress them from here on so they don't repeat down the stitched image.
        await chrome.scripting.executeScript({ target: { tabId }, func: suppressStickyForNextFrames });
      }

      const dataUrl = await captureVisibleTabThrottled(windowId);
      await sendToOffscreen({
        target: 'offscreen',
        type: 'STITCH_ADD_FRAME',
        dataUrl,
        yPx: Math.round(actualScrollY * dpr),
      });
    }

    const final = await sendToOffscreen({ target: 'offscreen', type: 'STITCH_FINALIZE' });
    if (!final.dataUrl) throw new Error('Offscreen document returned no composite image');
    return final.dataUrl;
  } finally {
    await chrome.offscreen.closeDocument().catch(() => {});
    await chrome.scripting
      .executeScript({ target: { tabId }, func: restoreStickyAndScroll, args: [originalScrollX, originalScrollY] })
      .catch(() => {});
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.target === 'offscreen') return; // that message is routed to the offscreen doc, not us
  const tabId = sender.tab?.id;
  const windowId = sender.tab?.windowId;
  if (tabId == null || windowId == null) {
    sendResponse({ ok: false, error: 'No source tab for capture request' } satisfies BackgroundResponse);
    return;
  }

  if (msg.type === 'CAPTURE_VIEWPORT') {
    captureVisibleTabThrottled(windowId)
      .then((dataUrl) => sendResponse({ ok: true, dataUrl } satisfies BackgroundResponse))
      .catch((err) => sendResponse({ ok: false, error: String(err) } satisfies BackgroundResponse));
    return true; // keep the message channel open for the async response above
  }

  if (msg.type === 'CAPTURE_FULL_PAGE') {
    captureFullPage(tabId, windowId)
      .then((dataUrl) => sendResponse({ ok: true, dataUrl } satisfies BackgroundResponse))
      .catch((err) => sendResponse({ ok: false, error: String(err) } satisfies BackgroundResponse));
    return true;
  }
});
