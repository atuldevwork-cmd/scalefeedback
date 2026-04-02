'use client';

import { useState, useEffect, useCallback } from 'react';

export function ScreenshotLightbox({ src, alt }: { src: string; alt?: string }) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, close]);

  return (
    <>
      {/* Thumbnail */}
      <button
        onClick={() => setOpen(true)}
        className="block w-full group relative overflow-hidden rounded-xl border border-gray-100 cursor-zoom-in"
        aria-label="View full screenshot"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? 'Screenshot'}
          className="w-full object-contain max-h-80 transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
            Click to zoom
          </div>
        </div>
      </button>

      {/* Lightbox overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10"
          onClick={close}
          style={{ animation: 'sf-fade-in 200ms ease-out both' }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Image */}
          <div
            className="relative max-w-6xl w-full"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'sf-scale-in 250ms cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt ?? 'Screenshot'}
              className="w-full rounded-2xl shadow-2xl object-contain max-h-[85vh]"
            />
            <button
              onClick={close}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 hover:scale-110 transition-transform"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes sf-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sf-scale-in {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
