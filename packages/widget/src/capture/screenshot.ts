import html2canvas from 'html2canvas';

async function toDataUrl(src: string, apiBaseUrl: string): Promise<string | null> {
  try {
    const resp = await fetch(`${apiBaseUrl}/api/image-proxy?url=${encodeURIComponent(src)}`);
    if (!resp.ok) return null;
    return await resp.text();
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

// --- CSS Color Level 4 patch ---
// html2canvas cannot parse lab(), lch(), oklab(), oklch() color functions.
// Before capture we replace them in <style> tags and same-origin <link> sheets
// with browser-resolved rgb() values using a 1×1 canvas trick.

const HAS_UNSUPPORTED_COLOR = /\b(?:lab|lch|oklab|oklch)\s*\(/i;

function makeColorResolver(): (cssColor: string) => string {
  const c = document.createElement('canvas');
  c.width = 1; c.height = 1;
  const ctx = c.getContext('2d');
  const cache = new Map<string, string>();
  return (cssColor: string): string => {
    if (cache.has(cssColor)) return cache.get(cssColor)!;
    if (!ctx) return cssColor;
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = cssColor;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      const resolved = d[3] < 255
        ? `rgba(${d[0]},${d[1]},${d[2]},${(d[3] / 255).toFixed(3)})`
        : `rgb(${d[0]},${d[1]},${d[2]})`;
      cache.set(cssColor, resolved);
      return resolved;
    } catch {
      return cssColor;
    }
  };
}

function patchCssText(css: string, resolve: (c: string) => string): string {
  // lab/lch/oklab/oklch don't use nested parens, so [^)]* is safe
  return css.replace(/\b(?:lab|lch|oklab|oklch)\s*\([^)]*\)/gi, resolve);
}

async function patchUnsupportedColors(): Promise<() => void> {
  const resolve = makeColorResolver();
  const undoFns: Array<() => void> = [];

  // 1. Inline <style> elements
  document.querySelectorAll<HTMLStyleElement>('style').forEach((el) => {
    const original = el.textContent ?? '';
    if (!HAS_UNSUPPORTED_COLOR.test(original)) return;
    el.textContent = patchCssText(original, resolve);
    undoFns.push(() => { el.textContent = original; });
  });

  // 2. Same-origin <link rel="stylesheet"> elements
  await Promise.all(
    Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'))
      .filter((link) => {
        try { return new URL(link.href).origin === window.location.origin; } catch { return false; }
      })
      .map(async (link) => {
        try {
          const res = await fetch(link.href);
          if (!res.ok) return;
          const text = await res.text();
          if (!HAS_UNSUPPORTED_COLOR.test(text)) return;
          const style = document.createElement('style');
          style.textContent = patchCssText(text, resolve);
          link.insertAdjacentElement('afterend', style);
          link.disabled = true;
          undoFns.push(() => { link.disabled = false; style.remove(); });
        } catch { /* cross-origin or fetch failed — skip */ }
      }),
  );

  return () => undoFns.forEach((fn) => fn());
}

export async function captureScreenshot(ignoreElementId: string, apiBaseUrl?: string): Promise<string> {
  const widgetHost = document.getElementById(ignoreElementId);
  if (widgetHost) widgetHost.style.setProperty('display', 'none', 'important');

  const fix = document.createElement('style');
  fix.id = 'sf-cap-fix';
  fix.textContent = [
    '*, *::before, *::after { box-shadow: none !important; }',
    '.sf-cap-hide-pseudo::before, .sf-cap-hide-pseudo::after { opacity: 0 !important; }',
  ].join('\n');
  document.head.appendChild(fix);

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

  const restorations: Array<{ img: HTMLImageElement; originalSrc: string }> = [];

  const allImgs = Array.from(document.querySelectorAll<HTMLImageElement>('img[src]'));
  const lazyImgs = allImgs.filter((img) => img.loading === 'lazy');
  lazyImgs.forEach((img) => { img.loading = 'eager'; });
  await Promise.all(lazyImgs.map((img) =>
    img.complete ? Promise.resolve() : new Promise<void>((res) => {
      img.onload = () => res();
      img.onerror = () => res();
    })
  ));

  // Convert unsupported CSS Color 4 functions so html2canvas doesn't throw
  let restoreColors: (() => void) | undefined;
  try {
    restoreColors = await patchUnsupportedColors();
  } catch { /* non-critical — proceed without patch */ }

  if (apiBaseUrl) {
    await Promise.all(
      allImgs.map(async (img) => {
        const src = img.src;
        if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
        if (!isCrossOrigin(src)) return;
        let dataUrl = await toDataUrl(src, apiBaseUrl);
        if (!dataUrl) return;

        if (dataUrl.startsWith('data:image/svg')) {
          const w = img.naturalWidth || img.width || 32;
          const h = img.naturalHeight || img.height || 32;
          dataUrl = await svgDataUrlToPng(dataUrl, w, h);
        }

        restorations.push({ img, originalSrc: src });
        img.src = dataUrl;
      })
    );
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
    restorations.forEach(({ img, originalSrc }) => { img.src = originalSrc; });
    blurPseudoEls.forEach((el) => el.classList.remove('sf-cap-hide-pseudo'));
    document.getElementById('sf-cap-fix')?.remove();
    restoreColors?.();
    if (widgetHost) widgetHost.style.removeProperty('display');
  }
}
