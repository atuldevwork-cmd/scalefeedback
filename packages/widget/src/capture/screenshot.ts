import html2canvas from 'html2canvas';

export async function captureScreenshot(ignoreElementId: string): Promise<string> {
  const widgetHost = document.getElementById(ignoreElementId);

  if (widgetHost) {
    widgetHost.style.setProperty('display', 'none', 'important');
  }

  await new Promise((r) => setTimeout(r, 60));

  try {
    // Step 1: capture the FULL document at 1:1 scale (no x/y/scroll options —
    // those have confusing interactions in html2canvas and cause wrong-section bugs).
    const fullCanvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      scale: 1,
      logging: false,
      ignoreElements: (el) =>
        el.id === ignoreElementId || el.id === 'sf-body-loading-overlay',
    });

    // Step 2: manually crop to the visible viewport.
    // At scale:1 the coordinates are exactly CSS pixels, so scrollX/scrollY
    // map directly to pixel offsets in the full-document canvas.
    const out = document.createElement('canvas');
    out.width  = window.innerWidth;
    out.height = window.innerHeight;
    const ctx  = out.getContext('2d')!;
    ctx.drawImage(
      fullCanvas,
      window.scrollX, window.scrollY,           // source: viewport top-left
      window.innerWidth, window.innerHeight,     // source: viewport size
      0, 0,                                      // dest: top-left of output
      window.innerWidth, window.innerHeight      // dest: full output (1:1)
    );

    return out.toDataURL('image/png');
  } finally {
    if (widgetHost) {
      widgetHost.style.removeProperty('display');
    }
  }
}
