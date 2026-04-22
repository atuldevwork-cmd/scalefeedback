'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

interface Props {
  projectId: string;
  projectDomain?: string;
}

type ScanState = 'idle' | 'scanning' | 'done' | 'error';

interface ScanResult {
  pagesScanned: number;
  issuesCreated: number;
  message?: string;
}

export function AiScanDialog({ projectId, projectDomain }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(10);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  function openDialog() {
    setScanState('idle');
    setResult(null);
    setErrorMsg('');
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function closeDialog() {
    if (scanState === 'scanning') return;
    setOpen(false);
  }

  function startScan() {
    if (!url.trim()) {
      setErrorMsg('Please enter a URL');
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`);
    } catch {
      setErrorMsg('Invalid URL — include https:// or a valid domain');
      return;
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      setErrorMsg('URL must use http or https');
      return;
    }

    setScanState('scanning');
    setErrorMsg('');

    startTransition(async () => {
      try {
        const resp = await fetch('/api/ai-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, url: parsedUrl.href, maxPages }),
        });

        const data = await resp.json() as {
          pagesScanned?: number;
          issuesCreated?: number;
          message?: string;
          error?: string;
        };

        if (!resp.ok) {
          setScanState('error');
          setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
          return;
        }

        setResult({
          pagesScanned: data.pagesScanned ?? 0,
          issuesCreated: data.issuesCreated ?? 0,
          message: data.message,
        });
        setScanState('done');

        if ((data.issuesCreated ?? 0) > 0) {
          toast(`${data.issuesCreated} issue${data.issuesCreated === 1 ? '' : 's'} added from AI scan`);
          router.refresh();
        }
      } catch {
        setScanState('error');
        setErrorMsg('Network error — check your connection and try again.');
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && scanState === 'idle') startScan();
    if (e.key === 'Escape') closeDialog();
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={openDialog}
        className="flex items-center gap-1.5 bg-[#ff724f] text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-[#e85e3a] transition-all shadow-sm"
      >
        <span className="material-symbols-outlined text-[16px]">travel_explore</span>
        Scan Website
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={(e) => { if (e.target === e.currentTarget) closeDialog(); }}
          onKeyDown={handleKeyDown}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#fff3f0] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#ff724f] text-[18px]">travel_explore</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#300a46]">AI Website Scanner</h2>
                  <p className="text-xs text-gray-400">Crawl pages and auto-generate issues</p>
                </div>
              </div>
              {scanState !== 'scanning' && (
                <button
                  onClick={closeDialog}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {scanState === 'scanning' && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-4 border-[#ff724f]/20 border-t-[#ff724f] animate-spin" />
                    <span
                      className="material-symbols-outlined text-[#ff724f] text-[22px] absolute inset-0 flex items-center justify-center"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      travel_explore
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#300a46]">Scanning website…</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Taking screenshots, capturing console errors, and analysing with Claude AI.
                      This may take 30–60 seconds.
                    </p>
                  </div>
                </div>
              )}

              {scanState === 'done' && result && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-green-500 text-[28px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#300a46]">Scan complete</p>
                    {result.message ? (
                      <p className="text-xs text-gray-500 mt-1">{result.message}</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        Scanned <strong>{result.pagesScanned}</strong> page{result.pagesScanned !== 1 ? 's' : ''} and
                        created <strong>{result.issuesCreated}</strong> issue{result.issuesCreated !== 1 ? 's' : ''}.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3 w-full mt-2">
                    <button
                      onClick={closeDialog}
                      className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => { setScanState('idle'); setResult(null); }}
                      className="flex-1 bg-[#ff724f] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#e85e3a] transition-colors"
                    >
                      Scan Again
                    </button>
                  </div>
                </div>
              )}

              {scanState === 'error' && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-red-500 text-[28px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      error
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#300a46]">Scan failed</p>
                    <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
                  </div>
                  <button
                    onClick={() => { setScanState('idle'); setErrorMsg(''); }}
                    className="w-full bg-[#ff724f] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#e85e3a] transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {scanState === 'idle' && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-gray-500">
                    Enter a specific page URL to scan just that page, a root domain to auto-discover pages,
                    or a{' '}
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">sitemap.xml</code> link.
                  </p>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#300a46]">Website URL</label>
                    <input
                      ref={inputRef}
                      type="url"
                      value={url}
                      onChange={(e) => { setUrl(e.target.value); setErrorMsg(''); }}
                      placeholder="https://example.com or https://example.com/sitemap.xml"
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm text-[#300a46] placeholder:text-gray-300 outline-none transition-all ${
                        errorMsg
                          ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                          : 'border-gray-200 focus:border-[#ff724f] focus:ring-2 focus:ring-[#ff724f]/10'
                      }`}
                    />
                    {errorMsg && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        {errorMsg}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#300a46]">Pages to scan</label>
                    <div className="flex gap-2">
                      {[1, 5, 10, 20, 30].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setMaxPages(n)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            maxPages === n
                              ? 'bg-[#ff724f] text-white border-[#ff724f]'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-[#ff724f]/50 hover:text-[#ff724f]'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#fff8f6] border border-[#ff724f]/20 rounded-xl p-3 flex gap-2.5">
                    <span
                      className="material-symbols-outlined text-[#ff724f] text-[16px] mt-0.5 shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      info
                    </span>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      The scanner checks for accessibility, SEO, UX, and technical issues.
                      Issues are added directly to this project&apos;s feedback list.
                    </p>
                  </div>

                  <div className="flex gap-3 mt-1">
                    <button
                      onClick={closeDialog}
                      className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={startScan}
                      disabled={!url.trim()}
                      className="flex-1 bg-[#ff724f] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#e85e3a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                      Start Scan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
