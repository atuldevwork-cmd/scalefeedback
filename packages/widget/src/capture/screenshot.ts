import html2canvas from 'html2canvas';

export async function captureScreenshot(ignoreElementId: string): Promise<string> {
  const widgetHost = document.getElementById(ignoreElementId);

  if (widgetHost) {
    widgetHost.style.setProperty('display', 'none', 'important');
  }

  // Small pause so the browser paints the page without the widget
  await new Promise((r) => setTimeout(r, 60));

  try {
    // Capture the visible viewport at 1:1 CSS pixel scale (same as marker.io).
    // scale:1 means canvas pixel = CSS pixel, so the output dimensions exactly
    // match the viewport — no stretching in the annotation canvas.
    const canvas = await html2canvas(document.body, {
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      logging: false,
      ignoreElements: (el) =>
        el.id === ignoreElementId || el.id === 'sf-body-loading-overlay',
    });

    return canvas.toDataURL('image/png');
  } finally {
    if (widgetHost) {
      widgetHost.style.removeProperty('display');
    }
  }
}
