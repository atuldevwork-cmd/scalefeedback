import { toPng } from 'html-to-image';

export async function captureScreenshot(ignoreElementId: string): Promise<string> {
  const widgetHost = document.getElementById(ignoreElementId);
  if (widgetHost) widgetHost.style.setProperty('display', 'none', 'important');

  await new Promise((r) => setTimeout(r, 80));

  try {
    return await toPng(document.documentElement, {
      width: window.innerWidth,
      height: window.innerHeight,
      style: {
        transform: `translate(-${window.scrollX}px, -${window.scrollY}px)`,
        transformOrigin: 'top left',
      },
      pixelRatio: window.devicePixelRatio,
      skipFonts: true,
      filter: (el) => {
        if (el instanceof Element) {
          const id = el.id;
          if (id === ignoreElementId || id === 'sf-body-loading-overlay') return false;
        }
        return true;
      },
    });
  } finally {
    if (widgetHost) widgetHost.style.removeProperty('display');
  }
}
