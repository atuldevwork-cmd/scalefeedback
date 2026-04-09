import html2canvas from 'html2canvas';

export async function captureScreenshot(ignoreElementId: string): Promise<string> {
  const widgetHost = document.getElementById(ignoreElementId);
  if (widgetHost) widgetHost.style.setProperty('display', 'none', 'important');

  // Temporarily strip CSS properties html2canvas cannot render.
  // box-shadow → white rectangle artifact.
  // filter on real elements → remove it.
  // filter:blur on ::before/::after → setting filter:none turns them into solid
  // coloured blobs, so we hide those pseudo-elements entirely (opacity:0).
  const fix = document.createElement('style');
  fix.id = 'sf-cap-fix';
  fix.textContent = [
    '*, *::before, *::after { box-shadow: none !important; }',
    '* { filter: none !important; -webkit-filter: none !important; }',
    '.sf-cap-hide-pseudo::before, .sf-cap-hide-pseudo::after { opacity: 0 !important; }',
  ].join('\n');
  document.head.appendChild(fix);

  // Tag every element whose ::before or ::after carries a filter
  const blurPseudoEls: Element[] = [];
  document.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const bf = window.getComputedStyle(el, '::before').filter;
    const af = window.getComputedStyle(el, '::after').filter;
    if ((bf && bf !== 'none') || (af && af !== 'none')) {
      el.classList.add('sf-cap-hide-pseudo');
      blurPseudoEls.push(el);
    }
  });

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
    blurPseudoEls.forEach((el) => el.classList.remove('sf-cap-hide-pseudo'));
    document.getElementById('sf-cap-fix')?.remove();
    if (widgetHost) widgetHost.style.removeProperty('display');
  }
}
