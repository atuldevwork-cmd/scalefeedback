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
    const dataUrl = await toPng(document.body, {
      cacheBust: true,
      // Capture only the visible viewport
      width: window.innerWidth,
      height: window.innerHeight,
      style: {
        transform: `translate(-${window.scrollX}px, -${window.scrollY}px)`,
        transformOrigin: 'top left',
        width: `${document.documentElement.scrollWidth}px`,
        height: `${document.documentElement.scrollHeight}px`,
      },
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        // Skip the widget host and the body-level loading overlay
        if (node.id === ignoreElementId) return false;
        if (node.id === 'sf-body-loading-overlay') return false;
        return true;
      },
      pixelRatio: Math.min(window.devicePixelRatio, 2),
    });

    return dataUrl;
  } finally {
    if (widgetHost) {
      widgetHost.style.removeProperty('display');
    }
  }
}
