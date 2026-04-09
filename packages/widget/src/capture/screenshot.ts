import html2canvas from 'html2canvas';

export async function captureScreenshot(ignoreElementId: string): Promise<string> {
  const widgetHost = document.getElementById(ignoreElementId);
  if (widgetHost) widgetHost.style.setProperty('display', 'none', 'important');

  // Temporarily strip CSS properties html2canvas cannot render:
  // box-shadow → white rectangle artifact, filter → solid blob artifact
  const fix = document.createElement('style');
  fix.id = 'sf-cap-fix';
  fix.textContent = '* { box-shadow: none !important; filter: none !important; -webkit-filter: none !important; }';
  document.head.appendChild(fix);

  await new Promise((r) => setTimeout(r, 80));

  try {
    // Capture full page at device pixel ratio for sharpness
    const fullCanvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      scale: window.devicePixelRatio,
      logging: false,
      backgroundColor: null,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
      ignoreElements: (el) =>
        el.id === ignoreElementId || el.id === 'sf-body-loading-overlay',
    });

    // Crop to the visible viewport (account for devicePixelRatio scaling)
    const dpr = window.devicePixelRatio;
    const out = document.createElement('canvas');
    out.width  = window.innerWidth  * dpr;
    out.height = window.innerHeight * dpr;
    const ctx  = out.getContext('2d')!;
    ctx.drawImage(
      fullCanvas,
      window.scrollX * dpr, window.scrollY * dpr,
      window.innerWidth * dpr, window.innerHeight * dpr,
      0, 0,
      window.innerWidth * dpr, window.innerHeight * dpr,
    );

    return out.toDataURL('image/png');
  } finally {
    document.getElementById('sf-cap-fix')?.remove();
    if (widgetHost) widgetHost.style.removeProperty('display');
  }
}
