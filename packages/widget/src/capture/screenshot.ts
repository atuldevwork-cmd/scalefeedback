import { toPng } from 'html-to-image';

export async function captureScreenshot(ignoreElementId: string): Promise<string> {
  const widgetHost = document.getElementById(ignoreElementId);

  if (widgetHost) {
    widgetHost.style.setProperty('display', 'none', 'important');
  }

  // Small pause so the browser paints the page without the widget
  await new Promise((r) => setTimeout(r, 60));

  // Use 2x on retina displays for sharp output
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  try {
    // Step 1: Capture the FULL document at dpr resolution.
    // We do NOT set explicit width/height on the canvas because any mismatch
    // between the element's natural size and the canvas size causes html-to-image
    // to scale/stretch the content. Let it render at native document size.
    const fullDataUrl = await toPng(document.body, {
      cacheBust: true,
      // Avoid SecurityError from cross-origin CSS (Google Fonts, CDN stylesheets)
      skipFonts: true,
      pixelRatio: dpr,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        if (node.id === ignoreElementId) return false;
        if (node.id === 'sf-body-loading-overlay') return false;
        return true;
      },
    });

    // Step 2: Crop the full-document image to the visible viewport.
    // The image is dpr × the CSS pixel dimensions, so all coordinates are scaled.
    const img = new Image();
    img.src = fullDataUrl;
    await new Promise<void>((resolve) => { img.onload = () => resolve(); });

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const canvas = document.createElement('canvas');
    canvas.width  = vw * dpr;
    canvas.height = vh * dpr;
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(
      img,
      window.scrollX * dpr, window.scrollY * dpr, // source origin (scroll offset × dpr)
      vw * dpr,              vh * dpr,              // source size  (viewport × dpr)
      0, 0,                                         // dest origin
      vw * dpr,              vh * dpr               // dest size (1:1 — no scaling)
    );

    return canvas.toDataURL('image/png');
  } finally {
    if (widgetHost) {
      widgetHost.style.removeProperty('display');
    }
  }
}
