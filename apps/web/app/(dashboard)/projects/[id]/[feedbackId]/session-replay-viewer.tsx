'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  events: unknown[];
}

interface RRWebEvent {
  type: number;
  data?: { width?: number; height?: number };
}

export function SessionReplayViewer({ events }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<{ play: () => void; pause: () => void } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [playerHeight, setPlayerHeight] = useState(320);

  useEffect(() => {
    if (!containerRef.current || !events?.length) return;
    let cancelled = false;

    // rrweb type-4 = Meta event — holds the original viewport size
    const metaEvent = (events as RRWebEvent[]).find(e => e.type === 4);
    const origW = metaEvent?.data?.width  ?? 1280;
    const origH = metaEvent?.data?.height ?? 720;

    import('rrweb').then(({ Replayer }) => {
      if (cancelled || !containerRef.current) return;

      // Inject minimal CSS (cursor + wrapper positioning)
      if (!document.getElementById('sf-rrweb-css')) {
        const s = document.createElement('style');
        s.id = 'sf-rrweb-css';
        s.textContent = `
          .replayer-wrapper { float: left; clear: both; transform-origin: top left; }
          .replayer-mouse {
            position: absolute; width: 20px; height: 20px; pointer-events: none; z-index: 100;
            transition: left .05s linear, top .05s linear;
            background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 13'%3E%3Cpath d='M0 0l8 8H5l1.5 5-2 .5L3 9H0z' fill='%23ff724f' stroke='white' stroke-width='.6'/%3E%3C/svg%3E") no-repeat center/contain;
          }
        `;
        document.head.appendChild(s);
      }

      try {
        const replayer = new Replayer(events as Parameters<typeof Replayer>[0], {
          root: containerRef.current,
          skipInactive: true,
          showController: false,
          useVirtualDom: false,
          mouseTail: false,
        });

        replayerRef.current = replayer as unknown as { play: () => void; pause: () => void };

        // Scale the recorded page to fit the dashboard column
        const applyScale = () => {
          if (!containerRef.current || cancelled) return;
          const cw = containerRef.current.offsetWidth || 600;
          const scale = cw / origW;
          const scaledH = origH * scale;

          const rw = containerRef.current.querySelector<HTMLElement>('.replayer-wrapper');
          if (rw) {
            rw.style.transformOrigin = 'top left';
            rw.style.transform = `scale(${scale})`;
            // Explicitly size the wrapper so it doesn't collapse
            rw.style.width  = `${origW}px`;
            rw.style.height = `${origH}px`;
          }

          setPlayerHeight(Math.round(scaledH));
          setLoaded(true);
        };

        // Small delay so rrweb finishes injecting the iframe/wrapper
        const timer = setTimeout(applyScale, 250);
        return () => clearTimeout(timer);
      } catch {
        if (!cancelled) setError(true);
      }
    }).catch(() => { if (!cancelled) setError(true); });

    return () => { cancelled = true; };
  }, [events]);

  function togglePlay() {
    if (!replayerRef.current) return;
    if (playing) {
      replayerRef.current.pause();
    } else {
      replayerRef.current.play();
    }
    setPlaying(p => !p);
  }

  if (!events?.length) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-foreground">Session Replay</h2>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#ff724f] bg-[#fff3f0] border border-[#ff724f]/20 px-1.5 py-0.5 rounded-md">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {events.length} events
        </span>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-gray-100">
        {/* Scaled player viewport */}
        <div
          ref={containerRef}
          className="relative w-full"
          style={{ height: playerHeight, overflow: 'hidden' }}
        >
          {!loaded && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-gray-100">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-[#ff724f] rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">Loading replay…</span>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <span className="text-xs text-muted-foreground">Could not load session replay</span>
            </div>
          )}
        </div>

        {/* Controls bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-t border-border">
          <button
            onClick={togglePlay}
            disabled={!loaded || !!error}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff724f] text-white text-xs font-semibold hover:bg-[#e8603a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {playing ? (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play replay
              </>
            )}
          </button>
          <span className="text-xs text-muted-foreground">Last 30s before submission · Inputs masked</span>
        </div>
      </div>
    </div>
  );
}
