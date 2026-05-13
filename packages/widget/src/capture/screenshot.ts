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
// html2canvas reads getComputedStyle() on ORIGINAL document elements before
// cloning. If those values contain lab()/oklab()/oklch() the internal color
// parser throws. Fix: (1) replace <link> sheets with patched <style> tags on
// the original document so the browser recomputes rgb() values, then
// (2) inline any remaining unsupported computed colors directly on elements.

const HAS_UNSUPPORTED_COLOR = /\b(?:lab|lch|oklab|oklch)\s*\(/i;

function makeColorResolver(): (cssColor: string) => string {
  const c = document.createElement('canvas');
  c.width = 1; c.height = 1;
  // willReadFrequently avoids repeated getImageData perf warnings
  const ctx = c.getContext('2d', { willReadFrequently: true });
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
  return css.replace(/\b(?:lab|lch|oklab|oklch)\s*\([^)]*\)/gi, resolve);
}

// When a fetched stylesheet is inserted as a <style> tag, relative url(...)
// references lose their original base URL and resolve against the page URL.
// This rewrite makes every url() absolute using the stylesheet's own href
// so font files, images, etc. still load correctly.
function makeUrlsAbsolute(css: string, base: string): string {
  return css.replace(/\burl\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match, quote, url) => {
    const t = url.trim();
    if (!t || t.startsWith('data:') || t.startsWith('#') ||
        /^https?:\/\//i.test(t) || t.startsWith('//')) return match;
    try {
      return `url(${quote}${new URL(t, base).href}${quote})`;
    } catch {
      return match;
    }
  });
}

// Color properties html2canvas reads via getComputedStyle
const COLOR_PROPS = [
  'color', 'background-color',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'outline-color', 'text-decoration-color', 'caret-color', 'fill', 'stroke',
] as const;

async function patchUnsupportedColors(): Promise<() => void> {
  const resolve = makeColorResolver();
  const undoFns: Array<() => void> = [];

  // Step 1 — patch inline <style> tags in the original document
  document.querySelectorAll<HTMLStyleElement>('style').forEach((el) => {
    const original = el.textContent ?? '';
    if (!HAS_UNSUPPORTED_COLOR.test(original)) return;
    el.textContent = patchCssText(original, resolve);
    undoFns.push(() => { el.textContent = original; });
  });

  // Step 2 — replace same-origin <link> stylesheets with patched <style> tags.
  // We physically remove the <link> so html2canvas can't re-fetch the original.
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
          // Patch colors AND make url() refs absolute so font/image paths
          // don't break when the <link> is replaced by a <style> tag.
          style.textContent = makeUrlsAbsolute(patchCssText(text, resolve), link.href);
          // Insert patched <style> then remove <link> to keep cascade order intact
          link.parentNode?.insertBefore(style, link);
          link.parentNode?.removeChild(link);
          undoFns.push(() => {
            if (style.parentNode) {
              style.parentNode.insertBefore(link, style);
              style.parentNode.removeChild(style);
            }
          });
        } catch { /* network error or cross-origin — skip */ }
      }),
  );

  // Let the browser recompute styles after stylesheet changes
  await new Promise((r) => setTimeout(r, 50));

  // Step 3 — fallback: inline any remaining unsupported computed colors on
  // individual elements. Catches cross-origin sheets we can't fetch/patch.
  const elementRestorations: Array<{ el: HTMLElement; prop: string; orig: string; pri: string }> = [];
  document.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const cs = getComputedStyle(el);
    for (const prop of COLOR_PROPS) {
      try {
        const val = cs.getPropertyValue(prop);
        if (!val || !HAS_UNSUPPORTED_COLOR.test(val)) continue;
        const resolved = resolve(val);
        if (resolved === val) continue;
        elementRestorations.push({
          el, prop,
          orig: el.style.getPropertyValue(prop),
          pri:  el.style.getPropertyPriority(prop),
        });
        el.style.setProperty(prop, resolved, 'important');
      } catch { /* skip non-applicable properties */ }
    }
  });

  undoFns.push(() => {
    elementRestorations.forEach(({ el, prop, orig, pri }) => {
      if (orig) el.style.setProperty(prop, orig, pri);
      else el.style.removeProperty(prop);
    });
  });

  return () => undoFns.forEach((fn) => fn());
}

export async function captureScreenshot(ignoreElementId: string, apiBaseUrl?: string): Promise<string> {
  const widgetHost = document.getElementById(ignoreElementId);
  if (widgetHost) widgetHost.style.setProperty('display', 'none', 'important');

  // Hide all iframes before capture — Safari throws SecurityError on
  // canvas.toDataURL() when ANY iframe (even ignored ones) has tainted
  // the canvas context through CSS or dynamic injection. Physical hiding
  // via visibility:hidden preserves layout; display:none is used as
  // fallback on fixed/absolute iframes which don't affect layout.
  type IframeEntry = { el: HTMLIFrameElement; vis: string; disp: string };
  const hiddenIframes: IframeEntry[] = [];
  document.querySelectorAll<HTMLIFrameElement>('iframe').forEach((el) => {
    hiddenIframes.push({ el, vis: el.style.visibility, disp: el.style.display });
    el.style.setProperty('visibility', 'hidden', 'important');
  });

  const fix = document.createElement('style');
  fix.id = 'sf-cap-fix';
  fix.textContent = [
    '*, *::before, *::after { box-shadow: none !important; }',
    '.sf-cap-hide-pseudo::before, .sf-cap-hide-pseudo::after { opacity: 0 !important; }',
  ].join('\n');
  document.head.appendChild(fix);

  // Strip ALL background-image / mask-image on the ORIGINAL document before
  // html2canvas clones it. This is the only reliable way to stop Safari from
  // tainting the canvas: cross-origin CDN backgrounds are stripped at the CSS
  // level, so html2canvas never fetches them. The loading overlay covers the
  // page during capture so the user never sees the flash of missing backgrounds.
  const bgScrub = document.createElement('style');
  bgScrub.id = 'sf-bg-scrub';
  bgScrub.textContent =
    '*, *::before, *::after { background-image: none !important; ' +
    '-webkit-mask-image: none !important; mask-image: none !important; }';
  document.head.appendChild(bgScrub);

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

  // Patch unsupported CSS Color Level 4 functions on the original document
  // so html2canvas gets rgb() values from getComputedStyle()
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

  // Convert inline SVGs to <img> data URLs on the ORIGINAL document BEFORE
  // html2canvas clones it. html2canvas calls imagesReady() before onclone,
  // so any <img> added inside onclone is never awaited and renders blank.
  // Converting here ensures the cloned doc already has <img> elements that
  // html2canvas can wait for. Restored in finally.
  type SvgReplacement = { parent: Node; svg: SVGSVGElement; img: HTMLImageElement; nextSibling: Node | null };
  const svgReplacements: SvgReplacement[] = [];
  document.querySelectorAll<SVGSVGElement>('svg').forEach((svgEl) => {
    const w = svgEl.getAttribute('width');
    const h = svgEl.getAttribute('height');
    if (!w || !h) return;
    try {
      const svgStr = new XMLSerializer().serializeToString(svgEl);
      const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
      const img = document.createElement('img');
      img.src = dataUrl;
      img.setAttribute('width', w);
      img.setAttribute('height', h);
      img.style.cssText = 'display:inline-block;vertical-align:middle;';
      const parent = svgEl.parentNode!;
      const nextSibling = svgEl.nextSibling;
      parent.replaceChild(img, svgEl);
      svgReplacements.push({ parent, svg: svgEl, img, nextSibling });
    } catch { /* skip */ }
  });
  // Data URLs load synchronously but wait anyway for Safari safety
  await Promise.all(svgReplacements.map(({ img }) =>
    img.complete ? Promise.resolve() : new Promise<void>((res) => { img.onload = img.onerror = () => res(); })
  ));

  try {
    const canvas = await html2canvas(document.body, {
      useCORS: false,   // do NOT use CORS — on Safari, CORS attempts for CDN images without
      allowTaint: false, // ACAO headers taint the canvas even when allowTaint:false should skip them.
                        // Cross-origin <img> srcs are already replaced with data URLs by the proxy
                        // step above, so those images still appear; CSS background-images from
                        // third-party CDNs will be absent but the canvas stays untainted.
      scale: 1,
      logging: false,
      backgroundColor: null,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      // onclone: remove elements that must not appear in the screenshot.
      // Background-image taint is already handled by sf-bg-scrub injected above.
      onclone: (clonedDoc) => {
        clonedDoc.getElementById(ignoreElementId)?.remove();
        clonedDoc.getElementById('sf-body-loading-overlay')?.remove();
        // Remove iframes, canvas (tracking/fingerprinting), video, object, embed
        clonedDoc.querySelectorAll('iframe, canvas, video, object, embed').forEach((el) => el.remove());
        // Replace any remaining cross-origin img srcs (proxy step may have missed srcset etc.)
        const blank = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
        const pageOrigin = window.location.origin;
        clonedDoc.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
          const src = img.getAttribute('src') ?? '';
          if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
            try { if (new URL(src).origin !== pageOrigin) img.setAttribute('src', blank); } catch {}
          }
          img.removeAttribute('srcset'); // srcset can still contain cross-origin URLs
        });

        // SVG→img conversion already done on the original document before this
        // clone was made, so the cloned doc already has <img> elements here.
      },
      ignoreElements: (el) => {
        if (el.id === ignoreElementId || el.id === 'sf-body-loading-overlay') return true;
        // Skip ALL iframes — even same-origin ones can embed cross-origin content
        // (e.g. YouTube embeds, payment widgets) which taints the canvas in Safari
        // and causes toDataURL() to throw SecurityError. All iframes are already
        // hidden with visibility:hidden before this call, so skipping them here
        // only removes blank space from the captured image.
        if (el.tagName === 'IFRAME') return true;
        return false;
      },
    });

    return canvas.toDataURL('image/png');
  } finally {
    restorations.forEach(({ img, originalSrc }) => { img.src = originalSrc; });
    blurPseudoEls.forEach((el) => el.classList.remove('sf-cap-hide-pseudo'));
    document.getElementById('sf-cap-fix')?.remove();
    document.getElementById('sf-bg-scrub')?.remove();
    restoreColors?.();
    // Restore SVGs that were replaced by img data URLs before capture
    svgReplacements.forEach(({ parent, svg, img, nextSibling }) => {
      try {
        if (img.parentNode === parent) {
          if (nextSibling && nextSibling.parentNode === parent) parent.insertBefore(svg, nextSibling);
          else parent.appendChild(svg);
          parent.removeChild(img);
        }
      } catch { /* already detached */ }
    });
    // Restore iframes
    hiddenIframes.forEach(({ el, vis, disp }) => {
      if (vis) el.style.visibility = vis; else el.style.removeProperty('visibility');
      if (disp) el.style.display = disp; else el.style.removeProperty('display');
    });
    if (widgetHost) widgetHost.style.removeProperty('display');
  }
}
