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
    '.sf-cap-hide-pseudo::before, .sf-cap-hide-pseudo::after { opacity: 0 !important; }',
  ].join('\n');
  document.head.appendChild(fix);

  // Only hide pseudo-elements that use blur() — these cause solid-blob artifacts
  // in html2canvas. Non-blur filters (color, hue-rotate, etc.) are left intact
  // so third-party widgets like TrustIndex render their icons correctly.
  const blurPseudoEls: Element[] = [];
  document.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const bf = window.getComputedStyle(el, '::before').filter;
    const af = window.getComputedStyle(el, '::after').filter;
    const hasBlur = (f: string) => f && f !== 'none' && f.includes('blur(');
    if (hasBlur(bf) || hasBlur(af)) {
      el.classList.add('sf-cap-hide-pseudo');
      blurPseudoEls.push(el);
    }
  });

  await new Promise((r) => setTimeout(r, 80));

  try {
    // Capture only the visible viewport to avoid exceeding mobile canvas size
    // limits (iOS GPUs reject canvases larger than ~16.7MP, producing a blank
    // white image when the full page is captured at 3x DPR).
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      scale: window.devicePixelRatio,
      logging: false,
      backgroundColor: null,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      ignoreElements: (el) =>
        el.id === ignoreElementId || el.id === 'sf-body-loading-overlay',
    });

    return canvas.toDataURL('image/png');
  } finally {
    blurPseudoEls.forEach((el) => el.classList.remove('sf-cap-hide-pseudo'));
    document.getElementById('sf-cap-fix')?.remove();
    if (widgetHost) widgetHost.style.removeProperty('display');
  }
}
