'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { Tooltip } from '@/components/ui/tooltip';
import { marketingUrl } from '@/lib/marketing-url';

interface Props {
  projectId: string;
  projectDomain?: string;
  plan: 'free' | 'pro' | 'agency';
}

type ScanState = 'idle' | 'scanning' | 'done' | 'error';

interface ScanResult {
  pagesScanned: number;
  issuesCreated: number;
  message?: string;
}

export function AiScanDialog({ projectId, projectDomain, plan }: Props) {
  const locked = plan !== 'agency';
  const [open, setOpen] = useState(false);
  const [urls, setUrls] = useState<string[]>(['']);
  const [errorMsgs, setErrorMsgs] = useState<string[]>(['']);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [globalError, setGlobalError] = useState('');
  const [, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const firstInputRef = useRef<HTMLInputElement>(null);

  function openDialog() {
    setScanState('idle');
    setResult(null);
    setGlobalError('');
    const initial = projectDomain
      ? [projectDomain.startsWith('http') ? projectDomain : `https://${projectDomain}`]
      : [''];
    setUrls(initial);
    setErrorMsgs(initial.map(() => ''));
    setOpen(true);
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }

  function closeDialog() {
    if (scanState === 'scanning') return;
    setOpen(false);
  }

  function addUrl() {
    setUrls(prev => [...prev, '']);
    setErrorMsgs(prev => [...prev, '']);
  }

  function removeUrl(index: number) {
    setUrls(prev => prev.filter((_, i) => i !== index));
    setErrorMsgs(prev => prev.filter((_, i) => i !== index));
  }

  function updateUrl(index: number, value: string) {
    setUrls(prev => prev.map((u, i) => (i === index ? value : u)));
    setErrorMsgs(prev => prev.map((e, i) => (i === index ? '' : e)));
  }

  function parseUrl(raw: string): string | null {
    try {
      const parsed = new URL(raw.trim().startsWith('http') ? raw.trim() : `https://${raw.trim()}`);
      if (!['http:', 'https:'].includes(parsed.protocol)) return null;
      return parsed.href;
    } catch {
      return null;
    }
  }

  function startScan() {
    const newErrors = urls.map(u => {
      if (!u.trim()) return 'Please enter a URL';
      if (!parseUrl(u)) return 'Invalid URL — include https:// or a valid domain';
      return '';
    });

    setErrorMsgs(newErrors);
    if (newErrors.some(e => e)) return;

    setScanState('scanning');
    setGlobalError('');

    startTransition(async () => {
      try {
        let totalPages = 0;
        let totalIssues = 0;

        for (const raw of urls) {
          const href = parseUrl(raw)!;
          const resp = await fetch('/api/ai-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, url: href, maxPages: 1 }),
          });

          const data = await resp.json() as {
            pagesScanned?: number;
            issuesCreated?: number;
            message?: string;
            error?: string;
          };

          if (resp.ok) {
            totalPages += data.pagesScanned ?? 0;
            totalIssues += data.issuesCreated ?? 0;
          }
        }

        setResult({ pagesScanned: totalPages, issuesCreated: totalIssues });
        setScanState('done');

        if (totalIssues > 0) {
          toast(`${totalIssues} issue${totalIssues === 1 ? '' : 's'} added from AI scan`);
          router.refresh();
        }
      } catch {
        setScanState('error');
        setGlobalError('Network error — check your connection and try again.');
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') closeDialog();
  }

  const hasValidUrl = urls.some(u => u.trim().length > 0);

  return (
    <>
      {/* Trigger button */}
      {locked ? (
        <a
          href={marketingUrl('/pricing')}
          title="Upgrade to Agency to unlock the AI website scanner"
          className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-500 text-sm font-medium px-3 py-2 rounded-xl hover:border-[#ff724f]/40 hover:text-[#111111] transition-all"
        >
          <span className="material-symbols-outlined text-[16px] text-gray-400">lock</span>
          AI Scan
          <span className="text-[10px] font-bold bg-[#fff3f0] text-[#ff724f] px-1.5 py-0.5 rounded-full tracking-wide">
            AGENCY
          </span>
        </a>
      ) : (
        <Tooltip content="One-time AI scan — checks UX, SEO, CRO & accessibility, then adds the findings to Feedback. Different from Monitor, which tracks accessibility issues over time.">
          <button
            onClick={openDialog}
            className="flex items-center gap-1.5 bg-[#ff724f] text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-[#e8603a] transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">travel_explore</span>
            AI Scan
          </button>
        </Tooltip>
      )}

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
                  <h2 className="text-base font-bold text-[#111111]">AI Scan</h2>
                  <p className="text-xs text-gray-400">One-time scan · adds issues to Feedback</p>
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

              {/* ── Scanning ── */}
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
                    <p className="text-sm font-semibold text-[#111111]">Scanning {urls.length} page{urls.length !== 1 ? 's' : ''}…</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Taking screenshots, capturing console errors, and analysing with AI.
                      This may take 30–60 seconds per page.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Done ── */}
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
                    <p className="text-sm font-semibold text-[#111111]">Scan complete</p>
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
                      className="flex-1 bg-[#ff724f] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#e8603a] transition-colors"
                    >
                      Scan Again
                    </button>
                  </div>
                </div>
              )}

              {/* ── Error ── */}
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
                    <p className="text-sm font-semibold text-[#111111]">Scan failed</p>
                    <p className="text-xs text-red-500 mt-1">{globalError}</p>
                  </div>
                  <button
                    onClick={() => { setScanState('idle'); setGlobalError(''); }}
                    className="w-full bg-[#ff724f] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#e8603a] transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* ── Idle ── */}
              {scanState === 'idle' && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-gray-500">
                    Enter one or more page URLs to scan. Each page will be checked for
                    UX, SEO, CRO, accessibility, and technical issues — once, right now.
                  </p>
                  <p className="text-xs text-gray-400 -mt-2.5">
                    Want issues tracked over time instead? Use{' '}
                    <a href={`/projects/${projectId}/monitor`} className="text-[#ff724f] font-medium hover:underline">
                      Monitor
                    </a>{' '}
                    for ongoing accessibility checks.
                  </p>

                  {/* URL repeater */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#111111]">Page URLs</label>
                    <div className="flex flex-col gap-2">
                      {urls.map((u, i) => (
                        <div key={i} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <input
                              ref={i === 0 ? firstInputRef : undefined}
                              type="url"
                              value={u}
                              onChange={(e) => updateUrl(i, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addUrl();
                                }
                              }}
                              placeholder="https://example.com/page"
                              className={`flex-1 border rounded-xl px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-gray-300 outline-none transition-all ${
                                errorMsgs[i]
                                  ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                                  : 'border-gray-200 focus:border-[#ff724f] focus:ring-2 focus:ring-[#ff724f]/10'
                              }`}
                            />
                            {urls.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeUrl(i)}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                              >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                            )}
                          </div>
                          {errorMsgs[i] && (
                            <p className="text-xs text-red-500 flex items-center gap-1 pl-1">
                              <span className="material-symbols-outlined text-[13px]">error</span>
                              {errorMsgs[i]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add URL button */}
                    <button
                      type="button"
                      onClick={addUrl}
                      className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#ff724f] hover:text-[#ff724f] transition-colors self-start"
                    >
                      <span className="w-5 h-5 rounded-full border border-[#ff724f] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[14px]">add</span>
                      </span>
                      Add another URL
                    </button>
                  </div>

                  <div className="bg-[#fff8f6] border border-[#ff724f]/20 rounded-xl p-3 flex gap-2.5">
                    <span
                      className="material-symbols-outlined text-[#ff724f] text-[16px] mt-0.5 shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      info
                    </span>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Issues are added directly to this project&apos;s feedback list.
                      Press <kbd className="bg-gray-100 border border-gray-200 rounded px-1 py-0.5 font-mono text-[10px]">Enter</kbd> in any field to add a new row.
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
                      disabled={!hasValidUrl}
                      className="flex-1 bg-[#ff724f] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#e8603a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
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
