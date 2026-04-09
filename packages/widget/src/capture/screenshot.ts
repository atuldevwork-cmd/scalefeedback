import html2canvas from 'html2canvas';

const IGNORE_ATTR = 'data-html2canvas-ignore';

/**
 * Elements with a large CSS blur filter (e.g. filter:blur(200px)) are purely
 * decorative background glows. html2canvas cannot render high-radius blurs
 * correctly — it renders them as solid/harsh colored shapes instead of soft
 * glows, tinting every section with unwanted colors.
 *
 * Fix: temporarily mark those elements with data-html2canvas-ignore so
 * html2canvas skips them entirely. The background becomes clean/neutral,
 * which matches the real page far better than a distorted blob.
 */
function disableLargeBlurElements(): Element[] {
  const ignored: Element[] = [];

  document.querySelectorAll<HTMLElement>('*').forEach((el) => {
    // Skip invisible / already-ignored elements
    if (el.hasAttribute(IGNORE_ATTR)) return;

    const filter = window.getComputedStyle(el).filter;
    if (!filter || filter === 'none') return;

    const match = filter.match(/blur\(([\d.]+)px\)/);
    if (match && parseFloat(match[1]) > 40) {
      el.setAttribute(IGNORE_ATTR, 'true');
      ignored.push(el);
    }
  });

  // Also inject a <style> that hides ::before/::after pseudo-elements whose
  // parent has a large blur — we can't read pseudo computed styles in JS,
  // so we hide ALL decorative pseudo-elements to keep backgrounds clean.
  const style = document.createElement('style');
  style.id = 'sf-pseudo-override';
  style.textContent =
    '*, *::before, *::after { backdrop-filter: none !important; }' +
    '*::before, *::after { opacity: 0 !important; }';
  document.head.appendChild(style);

  return ignored;
}

function restoreLargeBlurElements(els: Element[]) {
  els.forEach((el) => el.removeAttribute(IGNORE_ATTR));
  document.getElementById('sf-pseudo-override')?.remove();
}

export async function captureScreenshot(ignoreElementId: string): Promise<string> {
  const widgetHost = document.getElementById(ignoreElementId);
  if (widgetHost) widgetHost.style.setProperty('display', 'none', 'important');

  // Hide elements that html2canvas can't render correctly (large blur filters)
  const blurEls = disableLargeBlurElements();

  // Let the browser repaint without those elements
  await new Promise((r) => setTimeout(r, 80));

  try {
    const fullCanvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      scale: 1,
      logging: false,
      ignoreElements: (el) =>
        el.id === ignoreElementId || el.id === 'sf-body-loading-overlay',
    });

    // Crop to the visible viewport
    const out = document.createElement('canvas');
    out.width  = window.innerWidth;
    out.height = window.innerHeight;
    const ctx  = out.getContext('2d')!;
    ctx.drawImage(
      fullCanvas,
      window.scrollX, window.scrollY,
      window.innerWidth, window.innerHeight,
      0, 0,
      window.innerWidth, window.innerHeight
    );

    return out.toDataURL('image/png');
  } finally {
    restoreLargeBlurElements(blurEls);
    if (widgetHost) widgetHost.style.removeProperty('display');
  }
}
