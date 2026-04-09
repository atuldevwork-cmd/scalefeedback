import html2canvas from 'html2canvas';

export async function captureScreenshot(ignoreElementId: string): Promise<string> {
  const widgetHost = document.getElementById(ignoreElementId);
  if (widgetHost) widgetHost.style.setProperty('display', 'none', 'important');

  // --- Disable CSS blur filters -----------------------------------------------
  // html2canvas cannot render CSS filter:blur() — it renders the element without
  // the blur, causing background blobs / glows to appear as harsh solid shapes.
  // Fix: inject a <style> that strips ALL filters from every element and
  // pseudo-element for the duration of the capture, then remove it.
  const filterOverride = document.createElement('style');
  filterOverride.id = 'sf-filter-override';
  filterOverride.textContent =
    '*, *::before, *::after { filter: none !important; backdrop-filter: none !important; }';
  document.head.appendChild(filterOverride);

  // Also handle elements with inline filter styles
  const inlineFiltered: { el: HTMLElement; original: string }[] = [];
  document.querySelectorAll<HTMLElement>('[style*="filter"]').forEach((el) => {
    inlineFiltered.push({ el, original: el.style.filter });
    el.style.setProperty('filter', 'none', 'important');
  });

  // Small pause so the browser repaints without filters before capture
  await new Promise((r) => setTimeout(r, 80));

  try {
    const fullCanvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      scale: 1,
      logging: false,
      ignoreElements: (el) =>
        el.id === ignoreElementId || el.id === 'sf-body-loading-overlay',
    });

    // Crop to the visible viewport
    const out = document.createElement('canvas');
    out.width  = window.innerWidth;
    out.height = window.innerHeight;
    const ctx  = out.getContext('2d')!;
    ctx.drawImage(
      fullCanvas,
      window.scrollX, window.scrollY,
      window.innerWidth, window.innerHeight,
      0, 0,
      window.innerWidth, window.innerHeight
    );

    return out.toDataURL('image/png');
  } finally {
    // Restore everything
    filterOverride.remove();
    inlineFiltered.forEach(({ el, original }) => {
      if (original) el.style.filter = original;
      else el.style.removeProperty('filter');
    });
    if (widgetHost) widgetHost.style.removeProperty('display');
  }
}
