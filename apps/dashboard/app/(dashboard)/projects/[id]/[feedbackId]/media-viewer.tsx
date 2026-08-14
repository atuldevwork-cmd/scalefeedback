'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ScreenshotLightbox } from '@/components/screenshot-lightbox';

type Tab = 'screenshot' | 'replay';

interface Props {
  screenshotUrl: string | null;
  sessionEvents: unknown[];
  projectId: string;
  prevId: string | null;
  nextId: string | null;
  currentIndex: number;
  totalCount: number;
}

interface RRWebEvent {
  type: number;
  data?: { width?: number; height?: number };
}

interface ReplayerHandle {
  play: (timeOffset?: number) => void;
  pause: (timeOffset?: number) => void;
  getCurrentTime: () => number;
  getMetaData: () => { totalTime: number };
  on: (event: string, handler: () => void) => void;
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ReplayPlayer({ events }: { events: unknown[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<ReplayerHandle | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [playerHeight, setPlayerHeight] = useState(320);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !events?.length) return;
    let cancelled = false;

    // rrweb has no destroy() API, and this effect can re-run (StrictMode's
    // dev double-invoke, or `events` changing) — clear any leftover
    // .replayer-wrapper from a previous run so we never stack two replayers
    // in the same container.
    containerRef.current.innerHTML = '';

    const metaEvent = (events as RRWebEvent[]).find(e => e.type === 4);
    const origW = metaEvent?.data?.width  ?? 1280;
    const origH = metaEvent?.data?.height ?? 720;

    import('rrweb').then(({ Replayer }) => {
      if (cancelled || !containerRef.current) return;

      // rrweb 1.1.3 doesn't guard nested-iframe scroll targets whose
      // defaultView isn't ready yet — patch once so a stray scroll event
      // on a not-yet-mounted nested iframe can't crash the whole replay.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proto = Replayer.prototype as any;
      if (!proto.__scrollGuarded) {
        const originalApplyScroll = proto.applyScroll;
        proto.applyScroll = function (...args: unknown[]) {
          try {
            return originalApplyScroll.apply(this, args);
          } catch {
            // ignore — target document wasn't ready for this scroll event
          }
        };
        proto.__scrollGuarded = true;
      }

      if (!document.getElementById('sf-rrweb-css')) {
        const s = document.createElement('style');
        s.id = 'sf-rrweb-css';
        s.textContent = `
          .replayer-wrapper { float: left; clear: both; transform-origin: top left; }
          .replayer-mouse-tail { position: absolute; top: 0; left: 0; pointer-events: none; z-index: 99; }
          .replayer-mouse {
            position: absolute; width: 20px; height: 20px; pointer-events: none; z-index: 100;
            transition: left .05s linear, top .05s linear;
            background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 13'%3E%3Cpath d='M0 0l8 8H5l1.5 5-2 .5L3 9H0z' fill='%23ff724f' stroke='white' stroke-width='.6'/%3E%3C/svg%3E") no-repeat center/contain;
          }
        `;
        document.head.appendChild(s);
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const replayer = new Replayer(events as any, {
          root: containerRef.current,
          skipInactive: true,
          showController: false,
          useVirtualDom: false,
          mouseTail: {
            duration: 500,
            lineCap: 'round',
            lineWidth: 2,
            strokeStyle: '#ff724f',
          },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        replayerRef.current = replayer as unknown as ReplayerHandle;
        setDuration(replayer.getMetaData().totalTime);

        replayer.on('finish', () => {
          if (cancelled) return;
          setPlaying(false);
          setCurrentTime(replayerRef.current?.getMetaData().totalTime ?? 0);
        });

        setTimeout(() => {
          if (!containerRef.current || cancelled) return;
          const cw = containerRef.current.offsetWidth || 600;
          const scale = cw / origW;
          const rw = containerRef.current.querySelector<HTMLElement>('.replayer-wrapper');
          if (rw) {
            rw.style.transformOrigin = 'top left';
            rw.style.transform = `scale(${scale})`;
            rw.style.width  = `${origW}px`;
            rw.style.height = `${origH}px`;
          }
          setPlayerHeight(Math.round(origH * scale));
          setLoaded(true);
        }, 250);
      } catch { if (!cancelled) setError(true); }
    }).catch(() => { if (!cancelled) setError(true); });

    return () => {
      cancelled = true;
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [events]);

  // Poll playback position while playing to drive the progress bar
  useEffect(() => {
    if (!playing) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      return;
    }
    tickRef.current = setInterval(() => {
      if (replayerRef.current) setCurrentTime(replayerRef.current.getCurrentTime());
    }, 200);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [playing]);

  function togglePlay() {
    if (!replayerRef.current) return;
    if (playing) {
      replayerRef.current.pause();
    } else {
      // Resume from where it was paused instead of restarting from 0
      const resumeFrom = currentTime >= duration ? 0 : currentTime;
      replayerRef.current.play(resumeFrom);
    }
    setPlaying(p => !p);
  }

  function seekTo(ratio: number) {
    if (!replayerRef.current || !duration) return;
    const clamped = Math.min(1, Math.max(0, ratio));
    const time = clamped * duration;
    setCurrentTime(time);
    if (playing) {
      replayerRef.current.play(time);
    } else {
      replayerRef.current.pause(time);
    }
  }

  function handleScrubberInteraction(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    const bar = e.currentTarget;
    const updateFromEvent = (clientX: number) => {
      const rect = bar.getBoundingClientRect();
      seekTo((clientX - rect.left) / rect.width);
    };
    updateFromEvent(e.clientX);

    const handleMove = (moveEvent: MouseEvent) => updateFromEvent(moveEvent.clientX);
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }

  return (
    <div
      className="relative w-full bg-gray-950 cursor-pointer"
      style={{ height: loaded ? playerHeight : 320, overflow: 'hidden' }}
      onClick={loaded && !error ? togglePlay : undefined}
    >
      {/* rrweb mounts here */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading */}
      {!loaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-gray-950">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-[#ff724f] rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Loading replay…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
          <span className="text-xs text-gray-500">Could not load session replay</span>
        </div>
      )}

      {/* Centered play/pause overlay — shown when loaded */}
      {loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          {/* Show big play button only when paused */}
          {!playing && (
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white shadow-xl">
              <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Bottom info bar overlay */}
      {loaded && !error && (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-3 py-2"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.55))' }}>
          {/* Scrubber */}
          <div
            className="relative h-1.5 w-full rounded-full bg-white/20 cursor-pointer mb-2 group"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleScrubberInteraction}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[#ff724f]"
              style={{ width: `${duration ? Math.min(100, (currentTime / duration) * 100) : 0}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#ff724f] shadow opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${duration ? Math.min(100, (currentTime / duration) * 100) : 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between pointer-events-none">
            <span className="text-[11px] text-white/70 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            {playing && (
              <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Playing
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ href, children, disabled }: { href: string; children: React.ReactNode; disabled?: boolean }) {
  if (disabled) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-300 cursor-not-allowed select-none">
        {children}
      </span>
    );
  }
  return (
    <Link href={href}
      className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-[#ff724f] hover:bg-[#fff3f0] transition-all">
      {children}
    </Link>
  );
}

export function MediaViewer({
  screenshotUrl,
  sessionEvents,
  projectId,
  prevId,
  nextId,
  currentIndex,
  totalCount,
}: Props) {
  const hasReplay = sessionEvents.length > 0;
  const [tab, setTab] = useState<Tab>('screenshot');

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-white">

      {/* Compact tab bar */}
      <div className="flex items-center gap-2.5 px-3 py-2 border-b border-border bg-white">

        {/* Segmented tab group */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
          {/* Screenshot tab */}
          <button
            onClick={() => setTab('screenshot')}
            title="Screenshot"
            className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
              tab === 'screenshot'
                ? 'bg-white text-[#ff724f] shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Replay tab — only when events exist */}
          {hasReplay && (
            <button
              onClick={() => setTab('replay')}
              title="Session Replay"
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
                tab === 'replay'
                  ? 'bg-white text-red-500 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
        </div>

        {/* Active label */}
        <span className="text-xs text-gray-500 font-medium">
          {tab === 'screenshot' ? 'Screenshot' : (
            <>Session Replay <span className="text-red-400 font-semibold">{sessionEvents.length}</span></>
          )}
        </span>

        <div className="flex-1" />

        {/* Prev / counter / Next */}
        {totalCount > 0 && (
          <div className="flex items-center gap-0.5">
            <NavButton href={`/projects/${projectId}/${prevId}`} disabled={!prevId}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
              </svg>
            </NavButton>
            <span className="px-2 text-xs font-medium text-gray-500 tabular-nums">
              {currentIndex} of {totalCount}
            </span>
            <NavButton href={`/projects/${projectId}/${nextId}`} disabled={!nextId}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
              </svg>
            </NavButton>
          </div>
        )}
      </div>

      {/* Content */}
      {tab === 'screenshot' ? (
        screenshotUrl ? (
          <ScreenshotLightbox src={screenshotUrl} alt="Feedback screenshot" />
        ) : (
          <div className="flex items-center justify-center h-48 bg-gray-50">
            <div className="text-center text-muted-foreground">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">No screenshot captured</p>
            </div>
          </div>
        )
      ) : (
        <ReplayPlayer events={sessionEvents} />
      )}
    </div>
  );
}
