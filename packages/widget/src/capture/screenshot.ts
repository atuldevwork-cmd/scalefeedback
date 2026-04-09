import html2canvas from 'html2canvas';

export async function captureScreenshot(ignoreElementId: string): Promise<string> {
  const widgetHost = document.getElementById(ignoreElementId);
  if (widgetHost) widgetHost.style.setProperty('display', 'none', 'important');

  await new Promise((r) => setTimeout(r, 80));

  try {
    const canvas = await html2canvas(document.documentElement, {
      useCORS: true,
      allowTaint: false,
      scale: window.devicePixelRatio,
      logging: false,
      backgroundColor: null,
      width: window.innerWidth,
      height: window.innerHeight,
      x: window.scrollX,
      y: window.scrollY,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
      ignoreElements: (el) =>
        el.id === ignoreElementId || el.id === 'sf-body-loading-overlay',
    });

    return canvas.toDataURL('image/png');
  } finally {
    if (widgetHost) widgetHost.style.removeProperty('display');
  }
}
