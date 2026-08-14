// These functions are injected into the target page's own DOM via
// chrome.scripting.executeScript({ func: ... }) from background.ts. Chrome
// serializes each function by source text and re-runs it inside the page's
// context — so every function here MUST be fully self-contained: no imports,
// no closures over anything outside its own parameters/body.

const STICKY_MARK_ATTR = 'data-pinmarks-was-sticky';
const FREEZE_STYLE_ID = 'pinmarks-ext-freeze';

export interface PageMeasurements {
  totalHeightCss: number;
  viewportHeightCss: number;
  viewportWidthCss: number;
  dpr: number;
  originalScrollX: number;
  originalScrollY: number;
}

// Tags every sticky/fixed element (so a later step can suppress duplicates
// across scroll-and-stitch frames) and hides the drawn scrollbar for the
// duration of the capture. Returns the measurements the background script
// needs to plan scroll steps and size the stitched canvas.
export function freezeStickyAndMeasure(): PageMeasurements {
  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;

  document.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.position === 'sticky' || cs.position === 'fixed') {
      el.setAttribute(STICKY_MARK_ATTR, '');
    }
  });

  let style = document.getElementById(FREEZE_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = FREEZE_STYLE_ID;
    document.head.appendChild(style);
  }
  // Only the scrollbar-hide rule is active from the start; the sticky-suppress
  // rule is appended later (see suppressStickyForNextFrames) so the first
  // frame still shows sticky/fixed elements in their normal place.
  style.textContent = `
    html, body { scrollbar-width: none !important; }
    ::-webkit-scrollbar { display: none !important; }
  `;

  return {
    totalHeightCss: document.documentElement.scrollHeight,
    viewportHeightCss: window.innerHeight,
    viewportWidthCss: window.innerWidth,
    dpr: window.devicePixelRatio || 1,
    originalScrollX,
    originalScrollY,
  };
}

// Called before capturing the 2nd and subsequent frames — a sticky/fixed
// navbar correctly appears in every real-pixel frame at its on-screen
// position, which would otherwise duplicate it once per scroll step in the
// final stitched image. Forcing it static (out of the way, non-repeating)
// after the first frame keeps it in the composite exactly once, at the top.
export function suppressStickyForNextFrames(): void {
  const style = document.getElementById(FREEZE_STYLE_ID);
  if (!style) return;
  style.textContent += `\n[${STICKY_MARK_ATTR}] { position: static !important; }`;
}

// Scrolls to the requested Y, waits for paint + a short settle delay (lazy
// images, scroll-linked animations), and returns the ACTUAL scrollY the
// browser clamped to (bottom-of-page steps are clamped by the browser itself).
export async function scrollToStep(y: number): Promise<number> {
  window.scrollTo(0, y);
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  await new Promise((resolve) => setTimeout(resolve, 120));
  return window.scrollY;
}

export function restoreStickyAndScroll(originalScrollX: number, originalScrollY: number): void {
  document.querySelectorAll(`[${STICKY_MARK_ATTR}]`).forEach((el) => el.removeAttribute(STICKY_MARK_ATTR));
  document.getElementById(FREEZE_STYLE_ID)?.remove();
  window.scrollTo(originalScrollX, originalScrollY);
}
