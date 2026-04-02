import html2canvas from 'html2canvas';

export async function captureScreenshot(ignoreElementId: string): Promise<string> {
  // Hide the widget before capturing
  const widgetHost = document.getElementById(ignoreElementId);
  if (widgetHost) widgetHost.style.visibility = 'hidden';

  try {
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      scale: Math.min(window.devicePixelRatio, 2),
      logging: false,
      backgroundColor: null,
      ignoreElements: (el) => el.id === ignoreElementId,
      // Capture only the visible viewport
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    });

    return canvas.toDataURL('image/png');
  } finally {
    if (widgetHost) widgetHost.style.visibility = 'visible';
  }
}
