import { toPng } from 'html-to-image';

export async function captureScreenshot(ignoreElementId: string): Promise<string> {
  const widgetHost = document.getElementById(ignoreElementId);

  // Fully hide the widget before capturing (not just visibility — use display:none
  // so it takes no space and html-to-image skips it entirely)
  if (widgetHost) {
    widgetHost.style.setProperty('display', 'none', 'important');
  }

  // Small pause so the browser paints the page without the widget
  await new Promise((r) => setTimeout(r, 60));

  try {
    // Capture the full document at 1:1 pixel ratio. Setting explicit canvas
    // width/height that differ from the element's natural size causes html-to-image
    // to scale (stretch/squish) the content — so we let it capture everything at
    // native size, then manually crop to the visible viewport below.
    const fullDataUrl = await toPng(document.body, {
      cacheBust: true,
      skipFonts: true,
      pixelRatio: 1,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        // Skip the widget host and the body-level loading overlay
        if (node.id === ignoreElementId) return false;
        if (node.id === 'sf-body-loading-overlay') return false;
        return true;
      },
    });

    // Crop the full-document image to the visible viewport
    const img = new Image();
    img.src = fullDataUrl;
    await new Promise<void>((resolve) => { img.onload = () => resolve(); });

    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d')!;

    // Draw only the scrolled viewport region (pixelRatio is 1 so coords are 1:1)
    ctx.drawImage(
      img,
      window.scrollX, window.scrollY,       // source: top-left of visible area
      window.innerWidth, window.innerHeight, // source: viewport size
      0, 0,                                  // dest: top-left of canvas
      window.innerWidth, window.innerHeight  // dest: fill entire canvas
    );

    return canvas.toDataURL('image/png');
  } finally {
    if (widgetHost) {
      widgetHost.style.removeProperty('display');
    }
  }
}
