import html2canvas from 'html2canvas';

// Fetches a cross-origin image via the ScaleFeedback server-side proxy and
// returns a data URL. html2canvas cannot load cross-origin images directly
// when the CDN doesn't return CORS headers (TrustIndex, Google logos, etc.).
async function toDataUrl(src: string, apiBaseUrl: string): Promise<string | null> {
  try {
    const resp = await fetch(`${apiBaseUrl}/api/image-proxy?url=${encodeURIComponent(src)}`);
    if (!resp.ok) return null;
    return await resp.text(); // proxy returns full "data:<mime>;base64,..." string
  } catch {
    return null;
  }
}

function isCrossOrigin(src: string): boolean {
  try {
    return new URL(src).origin !== window.location.origin;
  } catch {
    return false;
  }
}

// html2canvas cannot reliably render <img src="*.svg"> or SVG data URLs.
// Convert to PNG via an offscreen canvas so html2canvas gets a raster image.
function svgDataUrlToPng(dataUrl: string, w: number, h: number): Promise<string> {
  return new Promise((resolve) => {
    const tmp = new Image();
    tmp.onload = () => {
      const c = document.createElement('canvas');
      c.width = w || tmp.naturalWidth || 32;
      c.height = h || tmp.naturalHeight || 32;
      const ctx = c.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(tmp, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/png'));
    };
    tmp.onerror = () => resolve(dataUrl);
    tmp.src = dataUrl;
  });
}

export async function captureScreenshot(ignoreElementId: string, apiBaseUrl?: string): Promise<string> {
  const widgetHost = document.getElementById(ignoreElementId);
  if (widgetHost) widgetHost.style.setProperty('display', 'none', 'important');

  // Temporarily strip box-shadow (causes white-rectangle artifacts in html2canvas).
  const fix = document.createElement('style');
  fix.id = 'sf-cap-fix';
  fix.textContent = [
    '*, *::before, *::after { box-shadow: none !important; }',
    '.sf-cap-hide-pseudo::before, .sf-cap-hide-pseudo::after { opacity: 0 !important; }',
  ].join('\n');
  document.head.appendChild(fix);

  // Hide only pseudo-elements that use blur() — they cause solid-blob artifacts.
  // Non-blur filters (color, hue-rotate, etc.) are left intact.
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

  // Replace cross-origin <img> srcs with proxied data URLs directly in the
  // live DOM. This is more reliable than html2canvas onclone because it
  // ensures html2canvas never tries to fetch the original cross-origin URL.
  // We restore originals in the finally block.
  const restorations: Array<{ img: HTMLImageElement; originalSrc: string }> = [];

  // Force-load lazy images: flip loading="eager" and wait for decode so their
  // pixel data is in memory before we proxy/rasterize them.
  const allImgs = Array.from(document.querySelectorAll<HTMLImageElement>('img[src]'));
  const lazyImgs = allImgs.filter((img) => img.loading === 'lazy');
  lazyImgs.forEach((img) => { img.loading = 'eager'; });
  await Promise.all(lazyImgs.map((img) =>
    img.complete ? Promise.resolve() : new Promise<void>((res) => {
      img.onload = () => res();
      img.onerror = () => res();
    })
  ));

  if (apiBaseUrl) {
    await Promise.all(
      allImgs.map(async (img) => {
        const src = img.src; // always absolute URL
        if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
        if (!isCrossOrigin(src)) return;
        let dataUrl = await toDataUrl(src, apiBaseUrl);
        if (!dataUrl) return;

        // html2canvas drops SVG images — rasterise to PNG first.
        if (dataUrl.startsWith('data:image/svg')) {
          const w = img.naturalWidth || img.width || 32;
          const h = img.naturalHeight || img.height || 32;
          dataUrl = await svgDataUrlToPng(dataUrl, w, h);
        }

        restorations.push({ img, originalSrc: src });
        img.src = dataUrl;
      })
    );
    // Pause so the browser paints the swapped data URLs before capture.
    await new Promise((r) => setTimeout(r, 200));
  } else {
    await new Promise((r) => setTimeout(r, 80));
  }

  try {
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
    // Restore original image srcs
    restorations.forEach(({ img, originalSrc }) => { img.src = originalSrc; });
    blurPseudoEls.forEach((el) => el.classList.remove('sf-cap-hide-pseudo'));
    document.getElementById('sf-cap-fix')?.remove();
    if (widgetHost) widgetHost.style.removeProperty('display');
  }
}
