'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { MonitorBulkActionsBar } from './monitor-bulk-actions';
import type { MonitorConfig, MonitorIssue, AccessibilityScoreEntry } from './page';

interface ScanJob {
  id: string;
  check_type: string;
  status: 'pending' | 'running' | 'cancelling' | 'cancelled' | 'completed' | 'failed';
  pages_crawled: number;
  links_checked: number;
  issues_found: number;
  error: string | null;
  // Only set on 'full_scan' jobs — the scan route's own progress row for
  // whichever synchronous checks (accessibility/seo/legal/AI) are enabled,
  // written to as each one starts/finishes (see api/monitor/[projectId]/
  // scan/route.ts). Null for broken_links/page_speed jobs.
  phases: Partial<Record<string, 'pending' | 'running' | 'completed'>> | null;
}

// Mirrors CHECK_OPTIONS' keys/order/labels below, plus 'crawling' — the
// synthetic first phase the scan route reports while fetching pages, before
// any per-page check has started.
const PHASE_LABELS: Record<string, string> = {
  crawling: 'Crawling pages',
  accessibility: 'Accessibility & WCAG',
  seo: 'SEO & AI-search',
  legal: 'Legal / privacy compliance',
  content_quality: 'Content quality / typos',
  brand_consistency: 'Brand consistency',
  custom: 'AI custom checks',
};
const PHASE_ORDER = ['crawling', 'accessibility', 'seo', 'legal', 'content_quality', 'brand_consistency', 'custom'];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function screenshotUrl(path: string | null): string | null {
  if (!path || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/screenshots/${path}`;
}

const PRIORITY_STYLE: Record<MonitorIssue['priority'], string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
};

const CATEGORY_META: Record<MonitorIssue['category'], { label: string; icon: string; className: string }> = {
  accessibility: { label: 'Accessibility', icon: 'accessibility_new', className: 'bg-purple-50 text-purple-700' },
  broken_links: { label: 'Broken link', icon: 'link_off', className: 'bg-blue-50 text-blue-700' },
  seo: { label: 'SEO & AI-search', icon: 'travel_explore', className: 'bg-teal-50 text-teal-700' },
  legal: { label: 'Legal & privacy', icon: 'gavel', className: 'bg-amber-50 text-amber-700' },
  content_quality: { label: 'Content quality', icon: 'spellcheck', className: 'bg-pink-50 text-pink-700' },
  brand_consistency: { label: 'Brand consistency', icon: 'palette', className: 'bg-indigo-50 text-indigo-700' },
  custom: { label: 'Custom check', icon: 'auto_awesome', className: 'bg-lime-50 text-lime-700' },
};

// Broken-link issue descriptions are generated worker-side (see
// apps/worker/src/index.ts's upsertBrokenLinkFindings) as:
// `"<link text>" → <href> (<server response detail>). Found on N page(s).`
// Pull the link text and server-response detail back out for the table
// columns instead of showing the raw prose sentence.
function parseBrokenLinkDescription(description: string): { linkText: string; detail: string } {
  const closeQuoteAt = description.indexOf('" → ');
  const linkText = closeQuoteAt > 0 ? description.slice(1, closeQuoteAt) : '';
  const detailMatch = description.match(/\(([^)]*)\)\.\s*Found on/);
  return { linkText, detail: detailMatch ? detailMatch[1] : '' };
}

function serverResponseBadge(detail: string): { label: string; className: string } {
  const httpMatch = detail.match(/^HTTP (\d+)/);
  if (httpMatch) return { label: httpMatch[1], className: 'bg-red-100 text-red-700' };
  const d = detail.toLowerCase();
  if (d.includes('timed out') || d.includes('timeout') || d.includes('aborted')) return { label: 'Timeout', className: 'bg-amber-100 text-amber-700' };
  if (d.includes('bad host') || d.includes('fetch failed') || d.includes('enotfound')) return { label: 'Bad host', className: 'bg-gray-200 text-gray-700' };
  return { label: detail || 'Unreachable', className: 'bg-gray-200 text-gray-700' };
}

// Page-speed issue descriptions are stored as JSON (not prose) by
// upsertPageSpeedFindings in apps/worker/src/index.ts — {mobile, desktop},
// each with a Lighthouse performance score, core metrics, and a "what to
// fix" opportunities list. Structured storage beats regex-parsing prose here
// since this is the one issue type where the raw data itself is the point.
interface PageSpeedOpportunityItem {
  url?: string;
  wastedBytes?: number;
  wastedMs?: number;
  totalBytes?: number;
}
interface PageSpeedOpportunity {
  title: string;
  savingsMs?: number;
  savingsBytes?: number;
  // Per-resource breakdown (which JS/CSS file, how much of it is wasted) —
  // only present on issues found by scans run after this was added; older
  // stored issues won't have it until rescanned.
  items?: PageSpeedOpportunityItem[];
}
interface PageSpeedStrategyData {
  score: number;
  lcp?: string;
  cls?: string;
  tbt?: string;
  fcp?: string;
  speedIndex?: string;
  opportunities: PageSpeedOpportunity[];
}
function parsePageSpeedIssue(description: string): { mobile: PageSpeedStrategyData; desktop: PageSpeedStrategyData } | null {
  try {
    const parsed = JSON.parse(description);
    if (parsed && typeof parsed.mobile?.score === 'number' && typeof parsed.desktop?.score === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}

function formatSavings(o: PageSpeedOpportunity): string {
  if (o.savingsMs && o.savingsMs >= 50) return `Est savings of ${(o.savingsMs / 1000).toFixed(1)}s`;
  if (o.savingsBytes) return `Est savings of ${Math.round(o.savingsBytes / 1024)} KiB`;
  return '';
}

function formatItemSavings(item: PageSpeedOpportunityItem): string {
  if (item.wastedMs && item.wastedMs >= 50) return `${(item.wastedMs / 1000).toFixed(1)}s wasted`;
  if (item.wastedBytes) return `${Math.round(item.wastedBytes / 1024)} KiB wasted${item.totalBytes ? ` of ${Math.round(item.totalBytes / 1024)} KiB` : ''}`;
  return '';
}

// Shortens a resource URL to just its path (or filename) for display —
// the full origin is redundant since every item is from the same page.
function shortenResourceUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search || url;
  } catch {
    return url;
  }
}

// One "what to fix" line (e.g. "Reduce unused JavaScript — Est savings of
// 2.9s"). When Lighthouse gave us a per-resource breakdown, clicking it
// expands to show which specific files it's flagging and how much of each
// is wasted — otherwise it's just a plain, non-interactive line.
function OpportunityRow({ opportunity: o }: { opportunity: PageSpeedOpportunity }) {
  const [expanded, setExpanded] = useState(false);
  const hasItems = !!o.items && o.items.length > 0;

  return (
    <li className="text-sm text-gray-700">
      <button
        type="button"
        onClick={() => hasItems && setExpanded((v) => !v)}
        disabled={!hasItems}
        className={`w-full flex items-start gap-1.5 text-left py-0.5 ${hasItems ? 'cursor-pointer hover:text-gray-900' : 'cursor-default'}`}
      >
        <span className="material-symbols-outlined text-[14px] text-amber-500 mt-0.5 shrink-0">build</span>
        <span className="flex-1">
          {o.title}{formatSavings(o) && <span className="text-gray-400"> — {formatSavings(o)}</span>}
        </span>
        {hasItems && (
          <span className="material-symbols-outlined text-[16px] text-gray-400 shrink-0">
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        )}
      </button>
      {expanded && hasItems && (
        <ul className="mt-1 mb-1.5 ml-5 pl-2.5 border-l border-gray-100 space-y-1">
          {o.items!.map((item, i) => (
            <li key={i} className="text-xs text-gray-500 break-all">
              {item.url ? shortenResourceUrl(item.url) : 'Unknown resource'}
              {formatItemSavings(item) && <span className="text-gray-400"> — {formatItemSavings(item)}</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// Matches Lighthouse's own score-band colors so the gauge reads consistently
// with pagespeed.web.dev for anyone cross-checking a result there.
function scoreColor(score: number): string {
  if (score >= 90) return '#0cce6b';
  if (score >= 50) return '#ffa400';
  return '#ff4e42';
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = scoreColor(score);
  const size = 60;
  const center = size / 2;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle
          cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
        <text x={center} y={center} textAnchor="middle" dominantBaseline="central" fontSize="16" fontWeight="700" fill={color}>
          {score}
        </text>
      </svg>
      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// Canonical keys sent to the scan API (and stored, comma-joined, in
// project_monitors.interested_check) — these double as monitor_issues.category
// values, so unchecking a box also scopes which categories get auto-resolved
// on that scan (see api/monitor/[projectId]/scan/route.ts).
const CHECK_OPTIONS: { key: string; label: string }[] = [
  { key: 'broken_links', label: 'Broken links' },
  { key: 'content_quality', label: 'Content quality / typos' },
  { key: 'legal', label: 'Legal / privacy compliance' },
  { key: 'accessibility', label: 'Accessibility & WCAG' },
  { key: 'seo', label: 'SEO & AI-search' },
  { key: 'brand_consistency', label: 'Brand consistency' },
  { key: 'custom', label: 'AI custom checks' },
];

// Before checkbox gating shipped, interested_check stored the option's
// display label (roadmap signal only). Map old labels to keys so an existing
// monitor's saved selection still carries over instead of resetting.
const LEGACY_LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  CHECK_OPTIONS.map((o) => [o.label, o.key])
);

interface SetupFormProps {
  targetUrl: string;
  setTargetUrl: (v: string) => void;
  wcagLevel: MonitorConfig['wcag_level'];
  setWcagLevel: (v: MonitorConfig['wcag_level']) => void;
  maxPages: number;
  setMaxPages: (v: number) => void;
  interestedChecks: string[];
  setInterestedChecks: (v: string[]) => void;
  customCheckPrompt: string;
  setCustomCheckPrompt: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  scanning: boolean;
  error: string | null;
}

function SetupForm({
  targetUrl, setTargetUrl, wcagLevel, setWcagLevel, maxPages, setMaxPages,
  interestedChecks, setInterestedChecks, customCheckPrompt, setCustomCheckPrompt,
  onSubmit, scanning, error,
}: SetupFormProps) {
  function toggleInterestedCheck(key: string) {
    setInterestedChecks(
      interestedChecks.includes(key)
        ? interestedChecks.filter((c) => c !== key)
        : [...interestedChecks, key]
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">URL or sitemap</label>
        <input
          type="url"
          required
          placeholder="https://example.com/sitemap.xml"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
        />
      </div>
      <div className="flex gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">WCAG level</label>
          <select
            value={wcagLevel}
            onChange={(e) => setWcagLevel(e.target.value as MonitorConfig['wcag_level'])}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
          >
            <option value="A">A</option>
            <option value="AA">AA</option>
            <option value="AAA">AAA</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Max pages</label>
          <input
            type="number"
            min={1}
            max={30}
            value={maxPages}
            onChange={(e) => setMaxPages(Number(e.target.value))}
            className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Which additional checks would you like next?</label>
        <div className="flex flex-wrap gap-1.5">
          {CHECK_OPTIONS.map((opt) => {
            const checked = interestedChecks.includes(opt.key);
            return (
              <label
                key={opt.key}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg border cursor-pointer transition-colors ${
                  checked ? 'bg-[#fff3f0] border-[#ff724f]/30 text-[#ff724f]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleInterestedCheck(opt.key)}
                  className="accent-[#ff724f]"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Unchecking a box skips it on your next scan. Content quality, brand consistency, and custom checks call an AI model, so scans with them take a bit longer.
          SEO &amp; AI-search also kicks off a Page Speed check (Google PageSpeed Insights) in the background — it keeps running after this scan finishes.
        </p>
        {interestedChecks.includes('custom') && (
          <div className="mt-2.5">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">What should the custom check look for?</label>
            <textarea
              value={customCheckPrompt}
              onChange={(e) => setCustomCheckPrompt(e.target.value)}
              placeholder="e.g. Flag any page that mentions a price without also linking to /pricing"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
            />
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={scanning}
        className="flex items-center gap-1.5 bg-[#ff724f] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#e8603a] transition-colors disabled:opacity-60"
      >
        <span className={`material-symbols-outlined text-[16px] ${scanning ? 'animate-spin' : ''}`}>{scanning ? 'progress_activity' : 'radar'}</span>
        {scanning ? 'Scanning…' : 'Scan now'}
      </button>
    </form>
  );
}

/* ── IssueActionsMenu ─────────────────────────────────────────────── */
// Collapses the per-issue action buttons (Send to feedback / Mark resolved /
// Dismiss / Reopen / Delete) into a single kebab-menu dropdown so a row of
// 3-4 chunky buttons doesn't dominate every issue card.
function IssueActionsMenu({
  issue, sending, updating, onSendToFeedback, onUpdateStatus, onDelete,
}: {
  issue: MonitorIssue;
  sending: boolean;
  updating: boolean;
  onSendToFeedback: () => void;
  onUpdateStatus: (status: 'open' | 'resolved' | 'dismissed') => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(ev: MouseEvent) {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  const busy = sending || updating;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-label="Issue actions"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[18px]">
          {busy ? 'progress_activity' : 'more_vert'}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20">
          <button
            onClick={() => run(onSendToFeedback)}
            className="w-full text-left text-xs font-medium text-blue-700 px-3 py-2 hover:bg-blue-50 transition-colors"
          >
            {sending ? 'Sending…' : 'Send to feedback'}
          </button>
          {issue.status !== 'resolved' && (
            <button
              onClick={() => run(() => onUpdateStatus('resolved'))}
              className="w-full text-left text-xs font-medium text-green-700 px-3 py-2 hover:bg-green-50 transition-colors"
            >
              Mark resolved
            </button>
          )}
          {issue.status !== 'dismissed' && (
            <button
              onClick={() => run(() => onUpdateStatus('dismissed'))}
              className="w-full text-left text-xs font-medium text-gray-600 px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              Dismiss
            </button>
          )}
          {issue.status !== 'open' && (
            <button
              onClick={() => run(() => onUpdateStatus('open'))}
              className="w-full text-left text-xs font-medium text-[#ff724f] px-3 py-2 hover:bg-[#fff3f0] transition-colors"
            >
              Reopen
            </button>
          )}
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={() => run(onDelete)}
            className="w-full text-left text-xs font-medium text-red-600 px-3 py-2 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

function phaseStatusIcon(status: PhaseStatus) {
  switch (status) {
    case 'completed':
      return <span className="material-symbols-outlined text-[16px] text-green-600">check_circle</span>;
    case 'running':
      return <span className="material-symbols-outlined text-[16px] text-[#ff724f] animate-spin">progress_activity</span>;
    case 'failed':
      return <span className="material-symbols-outlined text-[16px] text-red-500">error</span>;
    case 'cancelled':
      return <span className="material-symbols-outlined text-[16px] text-gray-400">block</span>;
    default:
      return <span className="w-4 h-4 rounded-full border-2 border-gray-200 shrink-0" />;
  }
}

// One combined "Scan progress" panel spanning every enabled category —
// broken_links comes from its own worker job (scanJob), everything else
// (crawling + accessibility/seo/legal/AI checks) comes from the scan route's
// 'full_scan' progress row (fullScanJob.phases). Shown only while something
// is actually in flight; per-category detail (pages crawled, issues found)
// still lives in each category tab as before — this is just the overview.
function ScanProgressPanel({
  configuredCategories, scanJob, fullScanJob, pageSpeedJob, aeoJob,
}: {
  configuredCategories: string[];
  scanJob: ScanJob | null;
  fullScanJob: ScanJob | null;
  pageSpeedJob: ScanJob | null;
  aeoJob: ScanJob | null;
}) {
  const items: { key: string; label: string; status: PhaseStatus }[] = [];

  if (fullScanJob?.phases?.crawling) {
    items.push({ key: 'crawling', label: PHASE_LABELS.crawling, status: fullScanJob.phases.crawling });
  }
  if (configuredCategories.includes('broken_links')) {
    const s = scanJob?.status ?? 'pending';
    items.push({
      key: 'broken_links',
      label: 'Broken links',
      status: s === 'cancelling' ? 'running' : (s as PhaseStatus),
    });
  }
  for (const key of PHASE_ORDER) {
    if (key === 'crawling') continue;
    if (!configuredCategories.includes(key)) continue;
    items.push({
      key,
      label: PHASE_LABELS[key],
      status: fullScanJob?.phases?.[key] ?? 'pending',
    });
  }
  // Page Speed is bundled under the "SEO & AI-search" checkbox but runs as
  // its own background job, independent of (and usually slower than) the
  // synchronous 'seo' phase above — tracked as its own row so "Scan
  // complete" doesn't fire while it's still checking pages.
  if (configuredCategories.includes('seo')) {
    const s = pageSpeedJob?.status ?? 'pending';
    items.push({
      key: 'page_speed',
      label: 'Page Speed',
      status: s === 'cancelling' ? 'running' : (s as PhaseStatus),
    });
  }
  // AEO is also bundled under "SEO & AI-search" but runs as its own
  // background job (deterministic, no AI call — see apps/worker/src/aeo.ts),
  // independent of both the synchronous 'seo' phase and Page Speed.
  if (configuredCategories.includes('seo')) {
    const s = aeoJob?.status ?? 'pending';
    items.push({
      key: 'aeo',
      label: 'AEO',
      status: s === 'cancelling' ? 'running' : (s as PhaseStatus),
    });
  }

  if (items.length === 0) return null;
  const doneCount = items.filter((i) => i.status === 'completed' || i.status === 'cancelled' || i.status === 'failed').length;
  const percent = Math.round((doneCount / items.length) * 100);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-[#111111]">Scan progress</p>
        <span className="text-xs font-bold text-[#ff724f]">{percent}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3.5">
        <div className="h-full bg-[#ff724f] transition-all duration-500 rounded-full" style={{ width: `${percent}%` }} />
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {items.map((item) => (
          <li key={item.key} className="inline-flex items-center gap-1.5 text-xs">
            {phaseStatusIcon(item.status)}
            <span className={item.status === 'completed' ? 'text-gray-400' : 'text-gray-700 font-medium'}>
              {item.label}
              {item.status === 'running' && <span className="text-[#ff724f]"> — running</span>}
              {item.status === 'completed' && ' — done'}
              {item.status === 'failed' && <span className="text-red-500"> — failed</span>}
              {item.status === 'cancelled' && ' — stopped'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Latest score as a big gauge (reusing the same ScoreGauge used for Page
// Speed, for visual consistency) plus a history table underneath — one row
// per scan, so a trend is visible without needing a separate chart.
// computeAccessibilityScore (apps/dashboard/lib/monitor.ts) weighs axe's
// passed vs. failed checks (critical failures counted more heavily), logged
// once per scan by the scan route.
function AccessibilityScoreHistory({ scores }: { scores: AccessibilityScoreEntry[] }) {
  const latest = scores[0];
  const scoreTextColor = (score: number) => (score >= 90 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600');
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
      <div className="flex items-center gap-5 flex-wrap">
        <ScoreGauge score={latest.score} label="latest" />
        <div>
          <p className="text-sm font-semibold text-[#111111]">Accessibility score</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {latest.failed_checks} failed check{latest.failed_checks === 1 ? '' : 's'} across {latest.pages_scanned} page{latest.pages_scanned === 1 ? '' : 's'}
            {' · '}{new Date(latest.scanned_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
          </p>
        </div>
      </div>
      {scores.length > 1 && (
        <div className="mt-4 pt-4 border-t border-gray-100 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="pb-2 pr-6 font-medium">Date</th>
                <th className="pb-2 pr-6 font-medium">Score</th>
                <th className="pb-2 font-medium">Failed checks</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr key={i} className="border-t border-gray-50">
                  <td className="py-2 pr-6 text-gray-600 whitespace-nowrap">{new Date(s.scanned_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}</td>
                  <td className={`py-2 pr-6 font-bold ${scoreTextColor(s.score)}`}>{s.score}</td>
                  <td className="py-2 text-gray-600">{s.failed_checks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface Props {
  projectId: string;
  canManage: boolean;
  monitor: MonitorConfig | null;
  issues: MonitorIssue[];
  accessibilityScores: AccessibilityScoreEntry[];
}

export function MonitorClient({ projectId, canManage, monitor, issues, accessibilityScores }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [targetUrl, setTargetUrl] = useState(monitor?.target_url ?? '');
  const [wcagLevel, setWcagLevel] = useState<MonitorConfig['wcag_level']>(monitor?.wcag_level ?? 'AA');
  const [maxPages, setMaxPages] = useState(monitor?.max_pages ?? 10);
  const [interestedChecks, setInterestedChecks] = useState<string[]>(
    monitor?.interested_check
      ? monitor.interested_check.split(',').map((c) => c.trim()).filter(Boolean).map((c) => LEGACY_LABEL_TO_KEY[c] ?? c)
      : CHECK_OPTIONS.map((o) => o.key)
  );
  const [customCheckPrompt, setCustomCheckPrompt] = useState(monitor?.custom_check_prompt ?? '');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'open' | 'resolved' | 'dismissed'>('open');
  const [categoryTab, setCategoryTab] = useState<string>('broken_links');
  // The 'seo' category bundles three very different things: a handful of
  // per-page metadata/structure checks, Page Speed (one entry per page
  // checked, often dozens), and AEO (AI-crawler/robots.txt + schema checks)
  // — each would otherwise drown out the others in one flat list.
  const [seoSubTab, setSeoSubTab] = useState<'other' | 'page_speed' | 'aeo'>('other');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [scanJob, setScanJob] = useState<ScanJob | null>(null);
  const [stoppingScan, setStoppingScan] = useState(false);
  const prevJobStatus = useRef<ScanJob['status'] | null>(null);
  const scanAbortRef = useRef<AbortController | null>(null);
  const [pageSpeedJob, setPageSpeedJob] = useState<ScanJob | null>(null);
  const [pageSpeedScanning, setPageSpeedScanning] = useState(false);
  const [pageSpeedError, setPageSpeedError] = useState<string | null>(null);
  const [stoppingPageSpeed, setStoppingPageSpeed] = useState(false);
  const prevPageSpeedStatus = useRef<ScanJob['status'] | null>(null);
  const [aeoJob, setAeoJob] = useState<ScanJob | null>(null);
  const [aeoScanning, setAeoScanning] = useState(false);
  const [aeoError, setAeoError] = useState<string | null>(null);
  const [stoppingAeo, setStoppingAeo] = useState(false);
  const [llmsTxtResult, setLlmsTxtResult] = useState<string | null>(null);
  const [generatingLlmsTxt, setGeneratingLlmsTxt] = useState(false);
  const [llmsTxtError, setLlmsTxtError] = useState<string | null>(null);
  const prevAeoStatus = useRef<ScanJob['status'] | null>(null);
  const [fullScanJob, setFullScanJob] = useState<ScanJob | null>(null);
  const prevFullScanStatus = useRef<ScanJob['status'] | null>(null);

  const isJobActive = (s: ScanJob['status'] | null) => s === 'pending' || s === 'running' || s === 'cancelling';

  // Both broken_links and page_speed run as background worker jobs (see
  // apps/worker) rather than inline in a scan request — poll each for
  // progress so the UI can show something better than a silent wait. The
  // worker upserts issues as it finds them (not just once at the end), so
  // refresh the issues list on every tick while either job is active, not
  // only when it completes — that's what makes newly-found issues show up in
  // the Open tab turant (as they're found) instead of only after the whole
  // site finishes crawling. Runs both on mount (in case a job from an
  // earlier visit or another tab is still in flight) and after triggering a
  // new scan.
  useEffect(() => {
    let cancelled = false;
    async function pollOne(checkType: string, setJob: (j: ScanJob | null) => void, prevStatus: React.MutableRefObject<ScanJob['status'] | null>) {
      const res = await fetch(`/api/monitor/${projectId}/scan-jobs?check_type=${checkType}`);
      if (!res.ok || cancelled) return false;
      const { job } = await res.json();
      if (cancelled) return false;
      setJob(job);
      const status = job?.status ?? null;
      const wasActive = isJobActive(prevStatus.current);
      const shouldRefresh = isJobActive(status) || (wasActive && (status === 'completed' || status === 'cancelled'));
      prevStatus.current = status;
      return shouldRefresh;
    }
    async function poll() {
      try {
        const results = await Promise.all([
          pollOne('broken_links', setScanJob, prevJobStatus),
          pollOne('page_speed', setPageSpeedJob, prevPageSpeedStatus),
          pollOne('full_scan', setFullScanJob, prevFullScanStatus),
          pollOne('aeo', setAeoJob, prevAeoStatus),
        ]);
        if (!cancelled && results.some(Boolean)) router.refresh();
      } catch { /* keep polling — a single failed check shouldn't stop it */ }
    }
    void poll();
    const interval = setInterval(poll, 4_000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Follows the scan as it moves through categories — whichever one the
  // "Scan progress" panel shows as currently running becomes the open tab
  // below it, so the user watches results land live instead of having to
  // guess which tab to click. Only switches when the running category
  // actually changes (not on every 4s poll tick), so a manual tab click in
  // between two phases isn't immediately fought.
  const lastAutoTabRef = useRef<string | null>(null);
  useEffect(() => {
    const configured = monitor?.interested_check
      ? monitor.interested_check.split(',').map((c) => c.trim()).filter(Boolean).map((c) => LEGACY_LABEL_TO_KEY[c] ?? c)
      : CHECK_OPTIONS.map((o) => o.key);
    const runningKey = ['broken_links', 'accessibility', 'seo', 'legal', 'content_quality', 'brand_consistency', 'custom']
      .find((key) => {
        if (!configured.includes(key)) return false;
        // 'pending' means still queued, not yet picked up by the worker —
        // matches the "running" definition the progress panel itself uses
        // (phaseStatusIcon only spins on 'running'/'cancelling', not
        // 'pending'), so the tab doesn't jump here before it's actually true.
        if (key === 'broken_links') return scanJob?.status === 'running' || scanJob?.status === 'cancelling';
        return fullScanJob?.phases?.[key] === 'running';
      }) ?? null;
    if (runningKey && runningKey !== lastAutoTabRef.current) {
      setCategoryTab(runningKey);
      setTab('open');
    }
    lastAutoTabRef.current = runningKey;
  }, [scanJob?.status, fullScanJob?.phases, monitor?.interested_check]);

  // Whole-scan status (broken_links job + full_scan job + the in-flight
  // "Scan now" request) — drives both the "Scan progress" panel's visibility
  // and the completion banner below.
  const isScanActive = scanning || isJobActive(scanJob?.status ?? null) || isJobActive(fullScanJob?.status ?? null) || isJobActive(pageSpeedJob?.status ?? null) || isJobActive(aeoJob?.status ?? null);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const wasScanActiveRef = useRef(false);
  useEffect(() => {
    if (!wasScanActiveRef.current && isScanActive) setShowCompletionBanner(false);
    else if (wasScanActiveRef.current && !isScanActive) setShowCompletionBanner(true);
    wasScanActiveRef.current = isScanActive;
  }, [isScanActive]);

  async function runScan(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setScanning(true);
    // Clear the previous run's job rows immediately — otherwise the "Scan
    // progress" panel keeps showing the last scan's 100%-complete state for
    // up to 4s (until the next poll tick fetches the fresh, just-queued
    // 'pending' rows), which reads as the bar going 100% → 0% instead of
    // starting clean at 0%.
    setScanJob(null);
    setFullScanJob(null);
    setPageSpeedJob(null);
    setAeoJob(null);
    const controller = new AbortController();
    scanAbortRef.current = controller;
    try {
      const res = await fetch(`/api/monitor/${projectId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_url: targetUrl, wcag_level: wcagLevel, max_pages: maxPages,
          interested_check: interestedChecks.join(', '),
          custom_check_prompt: customCheckPrompt,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Scan failed');
      router.refresh();
    } catch (err) {
      // A user-initiated abort (via stopScan below) isn't a real failure —
      // it's already reflected by the "Scan stopped" banner, so don't also
      // surface a confusing "AbortError" message.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
      scanAbortRef.current = null;
    }
  }

  async function stopScan() {
    setStoppingScan(true);
    try {
      const res = await fetch(`/api/monitor/${projectId}/scan-jobs?check_type=broken_links`, { method: 'PATCH' });
      if (res.ok) {
        // Optimistic: don't wait for the next 4s poll tick to reflect it.
        setScanJob((prev) => (prev && (prev.status === 'pending' || prev.status === 'running')
          ? { ...prev, status: prev.status === 'pending' ? 'cancelled' : 'cancelling' }
          : prev));
      }
      // This only cancels the broken-link crawl (a background worker job).
      // Accessibility/SEO/legal/AI checks run synchronously in the same
      // "Scan now" request and have no cancel hook of their own — the
      // request keeps running server-side either way (capped at 120s), but
      // there's no reason to leave the user staring at a stuck spinner for
      // it, so stop waiting on it client-side too.
      scanAbortRef.current?.abort();
      setScanning(false);
    } finally {
      setStoppingScan(false);
    }
  }

  // PSI itself is the slow part (~10s/page, run 3 at a time by the worker —
  // see AVG_SECONDS_PER_PAGE/CHECK_CONCURRENCY in apps/worker/src/pagespeed.ts,
  // duplicated here since the dashboard can't import from the worker
  // package) — showing a real estimate up front means clicking the button
  // isn't a leap of faith into an unknown wait.
  function estimatedPageSpeedSeconds(): number {
    const AVG_SECONDS_PER_PAGE = 10;
    const CHECK_CONCURRENCY = 3;
    // Use the saved monitor config, not the (possibly mid-edit, unsaved)
    // form state — that's what the worker actually reads when it runs.
    const pages = monitor?.max_pages ?? maxPages;
    return Math.ceil(pages / CHECK_CONCURRENCY) * AVG_SECONDS_PER_PAGE;
  }

  function formatDuration(totalSeconds: number): string {
    if (totalSeconds < 60) return `~${totalSeconds}s`;
    const minutes = Math.round(totalSeconds / 60);
    return `~${minutes} min`;
  }

  async function runPageSpeedScan() {
    setPageSpeedError(null);
    setPageSpeedScanning(true);
    try {
      const res = await fetch(`/api/monitor/${projectId}/page-speed-scan`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to start page speed check');
      router.refresh();
    } catch (err) {
      setPageSpeedError(err instanceof Error ? err.message : 'Failed to start page speed check');
    } finally {
      setPageSpeedScanning(false);
    }
  }

  async function stopPageSpeedScan() {
    setStoppingPageSpeed(true);
    try {
      const res = await fetch(`/api/monitor/${projectId}/scan-jobs?check_type=page_speed`, { method: 'PATCH' });
      if (res.ok) {
        setPageSpeedJob((prev) => (prev && (prev.status === 'pending' || prev.status === 'running')
          ? { ...prev, status: prev.status === 'pending' ? 'cancelled' : 'cancelling' }
          : prev));
      }
    } finally {
      setStoppingPageSpeed(false);
    }
  }

  // AEO is a lightweight fetch+cheerio crawl (no per-page 3rd-party API
  // calls like Page Speed's PSI), so it's much faster — no time estimate
  // needed the way Page Speed's button has one.
  async function runAeoScan() {
    setAeoError(null);
    setAeoScanning(true);
    try {
      const res = await fetch(`/api/monitor/${projectId}/aeo-scan`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to start AEO check');
      router.refresh();
    } catch (err) {
      setAeoError(err instanceof Error ? err.message : 'Failed to start AEO check');
    } finally {
      setAeoScanning(false);
    }
  }

  async function stopAeoScan() {
    setStoppingAeo(true);
    try {
      const res = await fetch(`/api/monitor/${projectId}/scan-jobs?check_type=aeo`, { method: 'PATCH' });
      if (res.ok) {
        setAeoJob((prev) => (prev && (prev.status === 'pending' || prev.status === 'running')
          ? { ...prev, status: prev.status === 'pending' ? 'cancelled' : 'cancelling' }
          : prev));
      }
    } finally {
      setStoppingAeo(false);
    }
  }

  // Module D — generates an llms.txt template from crawled data (deterministic,
  // no AI). We can't deploy it to the user's site ourselves, so this just
  // gives them text to copy and upload to /llms.txt themselves.
  async function generateLlmsTxt() {
    setLlmsTxtError(null);
    setGeneratingLlmsTxt(true);
    try {
      const res = await fetch(`/api/monitor/${projectId}/generate-llms-txt`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate llms.txt');
      setLlmsTxtResult(data.llmsTxt);
    } catch (err) {
      setLlmsTxtError(err instanceof Error ? err.message : 'Failed to generate llms.txt');
    } finally {
      setGeneratingLlmsTxt(false);
    }
  }

  async function copyLlmsTxt() {
    if (!llmsTxtResult) return;
    try {
      await navigator.clipboard.writeText(llmsTxtResult);
      toast('Copied to clipboard');
    } catch {
      toast('Could not copy — select and copy manually', 'error');
    }
  }

  async function updateStatus(issueId: string, status: 'open' | 'resolved' | 'dismissed') {
    setUpdatingId(issueId);
    try {
      await fetch(`/api/monitor/${projectId}/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteIssue(issueId: string) {
    if (!window.confirm('Delete this issue permanently? This can\'t be undone.')) return;
    setUpdatingId(issueId);
    try {
      await fetch(`/api/monitor/${projectId}/issues/${issueId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(dismissedIssues: MonitorIssue[]) {
    setSelectedIds((prev) =>
      prev.size === dismissedIssues.length ? new Set() : new Set(dismissedIssues.map((i) => i.id))
    );
  }

  async function sendToFeedback(issueId: string) {
    setSendingId(issueId);
    try {
      const res = await fetch(`/api/monitor/${projectId}/issues/send-to-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [issueId] }),
      });
      if (!res.ok) {
        toast('Failed to send issue to feedback', 'error');
        return;
      }
      toast('Issue sent to feedback');
      router.push(`/projects/${projectId}`);
    } finally {
      setSendingId(null);
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (!monitor) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-xl">
        <h2 className="text-lg font-bold text-[#111111] mb-1">Set up monitoring</h2>
        <p className="text-sm text-gray-500 mb-1.5">
          Enter a page URL, a whole sitemap, or your homepage — we&apos;ll scan it (and linked pages, up to your page limit)
          for accessibility, broken links, SEO &amp; AI-search, and legal/privacy issues, and keep tracking them over time.
        </p>
        <p className="text-xs text-gray-400 mb-5">
          Looking for a one-time UX, SEO & CRO check instead? Use{' '}
          <a href={`/projects/${projectId}`} className="text-[#ff724f] font-medium hover:underline">
            AI Scan
          </a>{' '}
          on the project page.
        </p>
        {!canManage ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            Only admins and owners can set up monitoring for this project.
          </p>
        ) : (
          <SetupForm
            targetUrl={targetUrl} setTargetUrl={setTargetUrl}
            wcagLevel={wcagLevel} setWcagLevel={setWcagLevel}
            maxPages={maxPages} setMaxPages={setMaxPages}
            interestedChecks={interestedChecks} setInterestedChecks={setInterestedChecks}
            customCheckPrompt={customCheckPrompt} setCustomCheckPrompt={setCustomCheckPrompt}
            onSubmit={runScan} scanning={scanning} error={error}
          />
        )}
      </div>
    );
  }

  // Top-level tabs are now by category (Broken Links, SEO & AI-search, etc.)
  // rather than status — a category tab shows up if it's currently checked
  // in "Which additional checks would you like next?" OR has any existing
  // issues (so unchecking a box later doesn't hide issues it already found
  // and orphan them from the UI). Open/Resolved/Dismissed becomes a smaller
  // filter scoped to whichever category tab is active.
  const configuredCategories = monitor.interested_check
    ? monitor.interested_check.split(',').map((c) => c.trim()).filter(Boolean).map((c) => LEGACY_LABEL_TO_KEY[c] ?? c)
    : CHECK_OPTIONS.map((o) => o.key);
  const issueCategorySet = new Set(issues.map((i) => i.category));
  const activeCategories = CHECK_OPTIONS
    .map((o) => o.key)
    .filter((key) => configuredCategories.includes(key) || issueCategorySet.has(key as MonitorIssue['category']));
  const currentCategoryTab = activeCategories.includes(categoryTab) ? categoryTab : activeCategories[0];
  const categoryIssues = currentCategoryTab ? issues.filter((i) => i.category === currentCategoryTab) : [];
  const isSeoTab = currentCategoryTab === 'seo';
  // Page Speed issues are upserted with rule_id `pagespeed-*` (see
  // upsertPageSpeedFindings in apps/worker/src/index.ts), AEO issues with
  // `aeo-*` (see upsertAeoFindings); every other 'seo' finding comes from
  // extractSeoFindings with rule_id `seo-*`.
  const seoPageSpeedIssues = isSeoTab ? categoryIssues.filter((i) => i.rule_id.startsWith('pagespeed-')) : [];
  const seoAeoIssues = isSeoTab ? categoryIssues.filter((i) => i.rule_id.startsWith('aeo-')) : [];
  const seoOtherIssues = isSeoTab ? categoryIssues.filter((i) => !i.rule_id.startsWith('pagespeed-') && !i.rule_id.startsWith('aeo-')) : [];
  const scopedIssues = isSeoTab
    ? (seoSubTab === 'page_speed' ? seoPageSpeedIssues : seoSubTab === 'aeo' ? seoAeoIssues : seoOtherIssues)
    : categoryIssues;
  const statusCounts = {
    open: scopedIssues.filter((i) => i.status === 'open').length,
    resolved: scopedIssues.filter((i) => i.status === 'resolved').length,
    dismissed: scopedIssues.filter((i) => i.status === 'dismissed').length,
  };
  const filtered = scopedIssues.filter((i) => i.status === tab);

  return (
    <div>
      {canManage && (
        <details className="group mb-6">
          <summary className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-700 px-3 py-1.5 rounded-lg cursor-pointer select-none transition-colors list-none [&::-webkit-details-marker]:hidden">
            <span className="material-symbols-outlined text-[15px]">tune</span>
            Edit monitor settings
            <span className="material-symbols-outlined text-[15px] text-gray-400 transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="mt-3 bg-white border border-gray-200 rounded-2xl p-6 max-w-xl">
            <SetupForm
              targetUrl={targetUrl} setTargetUrl={setTargetUrl}
              wcagLevel={wcagLevel} setWcagLevel={setWcagLevel}
              maxPages={maxPages} setMaxPages={setMaxPages}
              interestedChecks={interestedChecks} setInterestedChecks={setInterestedChecks}
              customCheckPrompt={customCheckPrompt} setCustomCheckPrompt={setCustomCheckPrompt}
              onSubmit={runScan} scanning={scanning} error={null}
            />
          </div>
        </details>
      )}

      {/* Config summary + rescan */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-[#111111] break-all">{monitor.target_url}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            WCAG {monitor.wcag_level} · up to {monitor.max_pages} pages
            {monitor.last_scanned_at && (
              <> · last scanned {new Date(monitor.last_scanned_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</>
            )}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => runScan()}
            disabled={scanning}
            className="flex items-center gap-1.5 bg-[#ff724f] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#e8603a] transition-colors disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[16px] ${scanning ? 'animate-spin' : ''}`}>{scanning ? 'progress_activity' : 'refresh'}</span>
            {scanning ? 'Scanning…' : 'Rescan'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {showCompletionBanner && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl leading-none" role="img" aria-label="Party popper">🎉</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">Scan complete!</p>
            <p className="text-xs text-green-700 mt-0.5">
              {issues.filter((i) => i.status === 'open').length} open issue{issues.filter((i) => i.status === 'open').length === 1 ? '' : 's'} across {activeCategories.length} categor{activeCategories.length === 1 ? 'y' : 'ies'}.
            </p>
          </div>
          <button
            onClick={() => setShowCompletionBanner(false)}
            aria-label="Dismiss"
            className="text-green-500 hover:text-green-700 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {isScanActive && (
        <ScanProgressPanel configuredCategories={configuredCategories} scanJob={scanJob} fullScanJob={fullScanJob} pageSpeedJob={pageSpeedJob} aeoJob={aeoJob} />
      )}

      {/* Category tabs */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {activeCategories.map((cat) => {
          const meta = CATEGORY_META[cat as MonitorIssue['category']];
          const openCount = issues.filter((i) => i.category === cat && i.status === 'open').length;
          const isActive = currentCategoryTab === cat;
          return (
            <button
              key={cat}
              onClick={() => { setCategoryTab(cat); setTab('open'); setSelectedIds(new Set()); }}
              className={`inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl font-semibold transition-all ${
                isActive ? 'bg-[#111111] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
              {meta.label}
              {openCount > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-white text-gray-500'}`}>
                  {openCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {currentCategoryTab === 'broken_links' && (
        <>
          {scanJob && (scanJob.status === 'pending' || scanJob.status === 'running' || scanJob.status === 'cancelling') && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px] text-[#ff724f] animate-spin">progress_activity</span>
              <div className="text-sm flex-1">
                <span className="font-medium text-[#111111]">
                  {scanJob.status === 'pending' ? 'Broken-link scan queued…' : scanJob.status === 'cancelling' ? 'Stopping scan…' : 'Scanning for broken links…'}
                </span>
                {(scanJob.status === 'running' || scanJob.status === 'cancelling') && (
                  <span className="text-gray-400 ml-1.5">
                    {scanJob.pages_crawled} pages crawled{scanJob.links_checked > 0 ? `, ${scanJob.links_checked} links checked` : ''}
                  </span>
                )}
              </div>
              {canManage && scanJob.status !== 'cancelling' && (
                <button
                  onClick={stopScan}
                  disabled={stoppingScan}
                  className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 shrink-0"
                >
                  {stoppingScan ? 'Stopping…' : 'Stop scan'}
                </button>
              )}
            </div>
          )}
          {scanJob?.status === 'failed' && (
            <p className="text-sm text-red-600 mb-4">Broken-link scan failed: {scanJob.error ?? 'unknown error'}</p>
          )}
          {scanJob?.status === 'cancelled' && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px] text-gray-500">block</span>
              <div className="text-sm">
                <span className="font-medium text-[#111111]">Scan stopped</span>
                <span className="text-gray-500 ml-1.5">
                  {scanJob.pages_crawled} page{scanJob.pages_crawled === 1 ? '' : 's'} scanned before stopping, {scanJob.issues_found} broken link{scanJob.issues_found === 1 ? '' : 's'} found
                </span>
              </div>
            </div>
          )}
          {scanJob?.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px] text-green-600">check_circle</span>
              <div className="text-sm">
                <span className="font-medium text-[#111111]">Broken-link scan completed</span>
                <span className="text-gray-500 ml-1.5">
                  {scanJob.pages_crawled} page{scanJob.pages_crawled === 1 ? '' : 's'} scanned, {scanJob.issues_found} broken link{scanJob.issues_found === 1 ? '' : 's'} found
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {isSeoTab && (
        <>
          {/* SEO sub-tabs — Page Speed produces one entry per page checked
              (often dozens) and would otherwise bury the handful of
              metadata/structure findings from the other SEO checks. */}
          <div className="flex gap-1.5 mb-3">
            {([
              { key: 'other' as const, label: 'Other SEO checks', count: seoOtherIssues.filter((i) => i.status === 'open').length },
              { key: 'page_speed' as const, label: 'Page Speed', count: seoPageSpeedIssues.filter((i) => i.status === 'open').length },
              { key: 'aeo' as const, label: 'AEO', count: seoAeoIssues.filter((i) => i.status === 'open').length },
            ]).map((sub) => (
              <button
                key={sub.key}
                onClick={() => { setSeoSubTab(sub.key); setTab('open'); setSelectedIds(new Set()); }}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                  seoSubTab === sub.key ? 'bg-teal-100 text-teal-800' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {sub.label}
                {sub.count > 0 && <span className="text-[10px] font-bold opacity-70">({sub.count})</span>}
              </button>
            ))}
          </div>

          {seoSubTab === 'page_speed' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-[#111111]">Page Speed check</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Google PageSpeed Insights (mobile performance) across up to {monitor.max_pages} pages.
                    {!isJobActive(pageSpeedJob?.status ?? null) && <> Takes about {formatDuration(estimatedPageSpeedSeconds())}.</>}
                  </p>
                </div>
                {canManage && !isJobActive(pageSpeedJob?.status ?? null) && (
                  <button
                    onClick={runPageSpeedScan}
                    disabled={pageSpeedScanning}
                    className="flex items-center gap-1.5 bg-[#ff724f] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#e8603a] transition-colors disabled:opacity-60 shrink-0"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${pageSpeedScanning ? 'animate-spin' : ''}`}>{pageSpeedScanning ? 'progress_activity' : 'speed'}</span>
                    {pageSpeedScanning ? 'Starting…' : 'Run Page Speed check'}
                  </button>
                )}
              </div>
              {pageSpeedError && <p className="text-sm text-red-600 mt-3">{pageSpeedError}</p>}

              {pageSpeedJob && isJobActive(pageSpeedJob.status) && (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                  <span className="material-symbols-outlined text-[18px] text-[#ff724f] animate-spin">progress_activity</span>
                  <div className="text-sm flex-1">
                    <span className="font-medium text-[#111111]">
                      {pageSpeedJob.status === 'pending' ? 'Page speed check queued…' : pageSpeedJob.status === 'cancelling' ? 'Stopping…' : 'Checking page speed…'}
                    </span>
                    {(pageSpeedJob.status === 'running' || pageSpeedJob.status === 'cancelling') && (
                      <span className="text-gray-400 ml-1.5">
                        {pageSpeedJob.links_checked}/{pageSpeedJob.pages_crawled || '?'} pages checked
                      </span>
                    )}
                  </div>
                  {canManage && pageSpeedJob.status !== 'cancelling' && (
                    <button
                      onClick={stopPageSpeedScan}
                      disabled={stoppingPageSpeed}
                      className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 shrink-0"
                    >
                      {stoppingPageSpeed ? 'Stopping…' : 'Stop check'}
                    </button>
                  )}
                </div>
              )}
              {pageSpeedJob?.status === 'failed' && (
                <p className="text-sm text-red-600 mt-3 pt-3 border-t border-gray-100">Page speed check failed: {pageSpeedJob.error ?? 'unknown error'}</p>
              )}
              {pageSpeedJob?.status === 'cancelled' && (
                <p className="text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
                  Stopped — {pageSpeedJob.links_checked} page{pageSpeedJob.links_checked === 1 ? '' : 's'} checked before stopping, {pageSpeedJob.issues_found} slow page{pageSpeedJob.issues_found === 1 ? '' : 's'} found.
                </p>
              )}
              {pageSpeedJob?.status === 'completed' && (
                <p className="text-sm text-green-700 mt-3 pt-3 border-t border-gray-100">
                  Completed — {pageSpeedJob.pages_crawled} page{pageSpeedJob.pages_crawled === 1 ? '' : 's'} checked, {pageSpeedJob.issues_found} slow page{pageSpeedJob.issues_found === 1 ? '' : 's'} found.
                </p>
              )}
            </div>
          )}

          {seoSubTab === 'aeo' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-[#111111]">AEO check</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Answer/AI-search engine optimization — checks whether AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.)
                    can actually access and cite this site: robots.txt blocks, llms.txt, FAQ schema, content that needs
                    JavaScript to render, and freshness dates. Deterministic checks only — no AI model call.
                  </p>
                </div>
                {canManage && !isJobActive(aeoJob?.status ?? null) && (
                  <button
                    onClick={runAeoScan}
                    disabled={aeoScanning}
                    className="flex items-center gap-1.5 bg-[#ff724f] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#e8603a] transition-colors disabled:opacity-60 shrink-0"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${aeoScanning ? 'animate-spin' : ''}`}>{aeoScanning ? 'progress_activity' : 'travel_explore'}</span>
                    {aeoScanning ? 'Starting…' : 'Run AEO check'}
                  </button>
                )}
              </div>
              {aeoError && <p className="text-sm text-red-600 mt-3">{aeoError}</p>}

              {aeoJob && isJobActive(aeoJob.status) && (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                  <span className="material-symbols-outlined text-[18px] text-[#ff724f] animate-spin">progress_activity</span>
                  <div className="text-sm flex-1">
                    <span className="font-medium text-[#111111]">
                      {aeoJob.status === 'pending' ? 'AEO check queued…' : aeoJob.status === 'cancelling' ? 'Stopping…' : 'Checking AEO signals…'}
                    </span>
                    {(aeoJob.status === 'running' || aeoJob.status === 'cancelling') && (
                      <span className="text-gray-400 ml-1.5">
                        {aeoJob.links_checked}/{aeoJob.pages_crawled || '?'} pages checked
                      </span>
                    )}
                  </div>
                  {canManage && aeoJob.status !== 'cancelling' && (
                    <button
                      onClick={stopAeoScan}
                      disabled={stoppingAeo}
                      className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 shrink-0"
                    >
                      {stoppingAeo ? 'Stopping…' : 'Stop check'}
                    </button>
                  )}
                </div>
              )}
              {aeoJob?.status === 'failed' && (
                <p className="text-sm text-red-600 mt-3 pt-3 border-t border-gray-100">AEO check failed: {aeoJob.error ?? 'unknown error'}</p>
              )}
              {aeoJob?.status === 'cancelled' && (
                <p className="text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
                  Stopped — {aeoJob.links_checked} page{aeoJob.links_checked === 1 ? '' : 's'} checked before stopping, {aeoJob.issues_found} issue{aeoJob.issues_found === 1 ? '' : 's'} found.
                </p>
              )}
              {aeoJob?.status === 'completed' && (
                <p className="text-sm text-green-700 mt-3 pt-3 border-t border-gray-100">
                  Completed — {aeoJob.pages_crawled} page{aeoJob.pages_crawled === 1 ? '' : 's'} checked, {aeoJob.issues_found} issue{aeoJob.issues_found === 1 ? '' : 's'} found.
                </p>
              )}

              {canManage && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-[#111111]">Generate llms.txt</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Builds a starting template from your site's homepage and key pages. We can't upload it for you —
                        copy the result and upload it yourself to {monitor.target_url.replace(/\/$/, '')}/llms.txt.
                      </p>
                    </div>
                    <button
                      onClick={generateLlmsTxt}
                      disabled={generatingLlmsTxt}
                      className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 shrink-0"
                    >
                      <span className={`material-symbols-outlined text-[16px] ${generatingLlmsTxt ? 'animate-spin' : ''}`}>{generatingLlmsTxt ? 'progress_activity' : 'auto_awesome'}</span>
                      {generatingLlmsTxt ? 'Generating…' : 'Generate template'}
                    </button>
                  </div>
                  {llmsTxtError && <p className="text-sm text-red-600 mt-3">{llmsTxtError}</p>}
                  {llmsTxtResult && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">llms.txt</p>
                        <button
                          onClick={copyLlmsTxt}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#ff724f] hover:underline"
                        >
                          <span className="material-symbols-outlined text-[14px]">content_copy</span>
                          Copy
                        </button>
                      </div>
                      <pre className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 whitespace-pre-wrap break-words max-h-80 overflow-y-auto">
                        {llmsTxtResult}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {currentCategoryTab === 'accessibility' && accessibilityScores.length > 0 && (
        <AccessibilityScoreHistory scores={accessibilityScores} />
      )}

      {/* Status filter — scoped to the active category tab */}
      <div className="flex gap-1.5 mb-5">
        {(['open', 'resolved', 'dismissed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedIds(new Set()); }}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all capitalize ${
              tab === t ? 'bg-[#ff724f] text-white' : 'bg-gray-50 text-gray-500 hover:bg-[#fff3f0] hover:text-[#ff724f]'
            }`}
          >
            {t} ({statusCounts[t]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-sm text-gray-500">
          {tab === 'open' ? 'No open issues — nice work!' : `No ${tab} issues.`}
        </div>
      ) : (
        <div className="space-y-3">
          {canManage && (
            <div className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${selectedIds.size > 0 ? 'bg-[#fff3f0]' : 'bg-transparent'}`}>
              <button
                onClick={() => toggleSelectAll(filtered)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  selectedIds.size > 0
                    ? 'bg-[#ff724f] border-[#ff724f]'
                    : 'border-gray-300 hover:border-[#ff724f]/60 bg-white'
                }`}
                aria-label="Select all"
              >
                {selectedIds.size > 0 && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    {selectedIds.size === filtered.length ? (
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <path d="M2.5 6h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    )}
                  </svg>
                )}
              </button>
              <span className="text-xs font-medium text-gray-500">Select all</span>
              {selectedIds.size > 0 && (
                <span className="text-xs font-semibold bg-[#ff724f] text-white px-2 py-0.5 rounded-full">
                  {selectedIds.size} selected
                </span>
              )}
            </div>
          )}
          {currentCategoryTab === 'broken_links' && filtered.length > 0 && (
            <div className="border border-gray-200 rounded-2xl bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-400">
                    {canManage && <th className="px-3 py-2 w-8" />}
                    <th className="px-3 py-2 w-8">#</th>
                    <th className="px-3 py-2">Broken link</th>
                    <th className="px-3 py-2">Link text</th>
                    <th className="px-3 py-2">Page where found</th>
                    <th className="px-3 py-2">Server response</th>
                    {canManage && <th className="px-3 py-2">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((issue, idx) => {
                    const { linkText, detail } = parseBrokenLinkDescription(issue.description);
                    const badge = serverResponseBadge(detail);
                    const isSelected = selectedIds.has(issue.id);
                    const firstPage = issue.pages[0];
                    return (
                      <tr key={issue.id} className={`border-b border-gray-100 last:border-0 align-top ${isSelected ? 'bg-[#fff3f0]/40' : ''}`}>
                        {canManage && (
                          <td className="px-3 py-2">
                            <button
                              onClick={() => toggleSelected(issue.id)}
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                isSelected ? 'bg-[#ff724f] border-[#ff724f]' : 'border-gray-300 hover:border-[#ff724f]/50 bg-white'
                              }`}
                              aria-label="Select"
                            >
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>
                          </td>
                        )}
                        <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2 max-w-[260px]">
                          {issue.help_url && (
                            <a href={issue.help_url} target="_blank" rel="noreferrer" className="text-[#ff724f] hover:underline break-all">
                              {issue.help_url}
                            </a>
                          )}
                        </td>
                        <td className="px-3 py-2 max-w-[180px] text-gray-600 break-words">{linkText}</td>
                        <td className="px-3 py-2 max-w-[220px]">
                          {firstPage && (
                            <a href={firstPage.page_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                              {firstPage.page_url}
                            </a>
                          )}
                          {issue.pages.length > 1 && <span className="text-gray-400"> +{issue.pages.length - 1} more</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
                        </td>
                        {canManage && (
                          <td className="px-3 py-2">
                            <IssueActionsMenu
                              issue={issue}
                              sending={sendingId === issue.id}
                              updating={updatingId === issue.id}
                              onSendToFeedback={() => sendToFeedback(issue.id)}
                              onUpdateStatus={(status) => updateStatus(issue.id, status)}
                              onDelete={() => deleteIssue(issue.id)}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {currentCategoryTab === 'seo' && seoSubTab === 'page_speed' && filtered.map((issue) => {
            const isSelected = selectedIds.has(issue.id);
            const data = parsePageSpeedIssue(issue.description);
            const pageUrl = issue.pages[0]?.page_url ?? '';
            return (
              <div key={issue.id} className={`bg-white border rounded-2xl p-5 transition-colors ${isSelected ? 'border-[#ff724f]/40 bg-[#fff3f0]/40' : 'border-gray-200'}`}>
                <div className="flex items-start gap-4">
                  {canManage && (
                    <button
                      onClick={() => toggleSelected(issue.id)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        isSelected ? 'bg-[#ff724f] border-[#ff724f]' : 'border-gray-300 hover:border-[#ff724f]/50 bg-white'
                      }`}
                      aria-label="Select"
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${PRIORITY_STYLE[issue.priority]}`}>
                        {issue.priority}
                      </span>
                      <a href={pageUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#111111] hover:text-[#ff724f] hover:underline break-all">
                        {pageUrl}
                      </a>
                    </div>
                    {data ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(['mobile', 'desktop'] as const).map((strategy) => {
                          const s = data[strategy];
                          return (
                            <div key={strategy} className="border border-gray-100 rounded-xl p-3">
                              <div className="flex items-center gap-4">
                                <ScoreGauge score={s.score} label={strategy} />
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                                  {s.fcp && <div>FCP <span className="font-medium text-gray-700">{s.fcp}</span></div>}
                                  {s.lcp && <div>LCP <span className="font-medium text-gray-700">{s.lcp}</span></div>}
                                  {s.tbt && <div>TBT <span className="font-medium text-gray-700">{s.tbt}</span></div>}
                                  {s.cls && <div>CLS <span className="font-medium text-gray-700">{s.cls}</span></div>}
                                  {s.speedIndex && <div>Speed Index <span className="font-medium text-gray-700">{s.speedIndex}</span></div>}
                                </div>
                              </div>
                              {s.opportunities.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">What to fix</p>
                                  <ul className="space-y-0.5">
                                    {s.opportunities.map((o, i) => (
                                      <OpportunityRow key={i} opportunity={o} />
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">{issue.title}</p>
                    )}
                  </div>
                  {canManage && (
                    <IssueActionsMenu
                      issue={issue}
                      sending={sendingId === issue.id}
                      updating={updatingId === issue.id}
                      onSendToFeedback={() => sendToFeedback(issue.id)}
                      onUpdateStatus={(status) => updateStatus(issue.id, status)}
                      onDelete={() => deleteIssue(issue.id)}
                    />
                  )}
                </div>
              </div>
            );
          })}
          {currentCategoryTab !== 'broken_links' && !(currentCategoryTab === 'seo' && seoSubTab === 'page_speed') && filtered.map((issue) => {
            const isExpanded = expanded.has(issue.id);
            const isSelected = selectedIds.has(issue.id);
            const firstShot = screenshotUrl(issue.pages[0]?.screenshot_path ?? null);
            return (
              <div key={issue.id} className={`bg-white border rounded-2xl p-5 transition-colors ${isSelected ? 'border-[#ff724f]/40 bg-[#fff3f0]/40' : 'border-gray-200'}`}>
                <div className="flex items-start gap-4">
                  {canManage && (
                    <button
                      onClick={() => toggleSelected(issue.id)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        isSelected ? 'bg-[#ff724f] border-[#ff724f]' : 'border-gray-300 hover:border-[#ff724f]/50 bg-white'
                      }`}
                      aria-label="Select"
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                  {firstShot && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstShot} alt="" className="w-24 h-16 object-cover object-top rounded-lg border border-gray-200 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${PRIORITY_STYLE[issue.priority]}`}>
                        {issue.priority}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORY_META[issue.category].className}`}>
                        <span className="material-symbols-outlined text-[12px]">{CATEGORY_META[issue.category].icon}</span>
                        {CATEGORY_META[issue.category].label}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">{issue.rule_id}</span>
                    </div>
                    <p className="text-sm font-semibold text-[#111111]">{issue.title}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{issue.description}</p>
                    <button
                      onClick={() => toggleExpanded(issue.id)}
                      className="text-xs font-medium text-[#ff724f] mt-2 hover:underline"
                    >
                      {issue.pages.length} page{issue.pages.length > 1 ? 's' : ''} affected {isExpanded ? '▲' : '▼'}
                    </button>
                    {isExpanded && (
                      <ul className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                        {issue.pages.map((p, i) => (
                          <li key={i} className="text-xs text-gray-500 break-all">
                            <a href={p.page_url} target="_blank" rel="noreferrer" className="hover:text-[#ff724f] hover:underline">
                              {p.page_url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {issue.help_url && (
                      <a
                        href={issue.help_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gray-400 mt-2 hover:text-[#ff724f]"
                      >
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        {issue.category === 'accessibility' ? 'WCAG reference' : issue.category === 'broken_links' ? 'Open link' : 'Reference'}
                      </a>
                    )}
                  </div>
                  {canManage && (
                    <IssueActionsMenu
                      issue={issue}
                      sending={sendingId === issue.id}
                      updating={updatingId === issue.id}
                      onSendToFeedback={() => sendToFeedback(issue.id)}
                      onUpdateStatus={(status) => updateStatus(issue.id, status)}
                      onDelete={() => deleteIssue(issue.id)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MonitorBulkActionsBar
        projectId={projectId}
        issueIds={Array.from(selectedIds)}
        onDone={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
