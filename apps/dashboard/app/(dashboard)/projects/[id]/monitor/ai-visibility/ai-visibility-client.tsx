'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/toast';

interface Prompt {
  id: string;
  prompt_text: string;
  created_at: string;
}

interface Competitor {
  id: string;
  name: string;
  domain: string | null;
  created_at: string;
}

interface Run {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_calls: number;
  completed_calls: number;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

interface Result {
  id: string;
  engine: 'chatgpt' | 'claude' | 'perplexity' | 'gemini';
  cited_urls: string[];
  brand_mentioned: boolean;
  brand_cited: boolean;
  position: 'early' | 'mid' | 'late' | null;
  competitors_mentioned: string[];
  sentiment_score: number | null;
  sentiment_justification: string | null;
  error: string | null;
  prompt_id: string;
  aeo_prompts: { prompt_text: string } | { prompt_text: string }[] | null;
}

const ENGINE_META: Record<Result['engine'], { label: string; icon: string; className: string }> = {
  chatgpt: { label: 'ChatGPT', icon: 'chat', className: 'bg-green-50 text-green-700' },
  claude: { label: 'Claude', icon: 'auto_awesome', className: 'bg-orange-50 text-orange-700' },
  perplexity: { label: 'Perplexity', icon: 'travel_explore', className: 'bg-teal-50 text-teal-700' },
  gemini: { label: 'Gemini', icon: 'diamond', className: 'bg-blue-50 text-blue-700' },
};

function isJobActive(status: Run['status'] | null) {
  return status === 'pending' || status === 'running';
}

// aeo_prompts comes back as an object from Supabase's FK-join select, but
// the generated type can be an array depending on relationship inference —
// handle both so a schema-cache quirk doesn't crash rendering.
function promptTextOf(result: Result): string {
  const rel = result.aeo_prompts;
  if (!rel) return '(deleted prompt)';
  return Array.isArray(rel) ? (rel[0]?.prompt_text ?? '(deleted prompt)') : rel.prompt_text;
}

export function AiVisibilityClient({ projectId, canManage, brandName }: { projectId: string; canManage: boolean; brandName: string }) {
  const toast = useToast();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [addingPrompt, setAddingPrompt] = useState(false);
  const [newCompetitorName, setNewCompetitorName] = useState('');
  const [newCompetitorDomain, setNewCompetitorDomain] = useState('');
  const [addingCompetitor, setAddingCompetitor] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    const [promptsRes, competitorsRes] = await Promise.all([
      fetch(`/api/monitor/${projectId}/aeo-prompts`),
      fetch(`/api/monitor/${projectId}/aeo-competitors`),
    ]);
    const promptsData = await promptsRes.json();
    const competitorsData = await competitorsRes.json();
    setPrompts(promptsData.prompts ?? []);
    setCompetitors(competitorsData.competitors ?? []);
    setLoaded(true);
  }, [projectId]);

  useEffect(() => { void loadConfig(); }, [loadConfig]);

  // Poll the latest run while it's active — same pattern as the Monitor
  // scan-jobs polling, just against a different table.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/monitor/${projectId}/aeo-visibility-run`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setRun(data.run);
        setResults(data.results ?? []);
      } catch { /* keep polling — a single failed check shouldn't stop it */ }
    }
    void poll();
    const interval = setInterval(poll, 4_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [projectId]);

  async function addPrompt(e: React.FormEvent) {
    e.preventDefault();
    const text = newPrompt.trim();
    if (!text) return;
    setAddingPrompt(true);
    try {
      const res = await fetch(`/api/monitor/${projectId}/aeo-prompts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt_text: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add prompt');
      setPrompts((prev) => [...prev, data.prompt]);
      setNewPrompt('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add prompt', 'error');
    } finally {
      setAddingPrompt(false);
    }
  }

  async function deletePrompt(id: string) {
    setPrompts((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/monitor/${projectId}/aeo-prompts/${id}`, { method: 'DELETE' });
  }

  async function addCompetitor(e: React.FormEvent) {
    e.preventDefault();
    const name = newCompetitorName.trim();
    if (!name) return;
    setAddingCompetitor(true);
    try {
      const res = await fetch(`/api/monitor/${projectId}/aeo-competitors`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain: newCompetitorDomain.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add competitor');
      setCompetitors((prev) => [...prev, data.competitor]);
      setNewCompetitorName('');
      setNewCompetitorDomain('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add competitor', 'error');
    } finally {
      setAddingCompetitor(false);
    }
  }

  async function deleteCompetitor(id: string) {
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/monitor/${projectId}/aeo-competitors/${id}`, { method: 'DELETE' });
  }

  async function triggerRun() {
    setRunError(null);
    setTriggering(true);
    try {
      const res = await fetch(`/api/monitor/${projectId}/aeo-visibility-run`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to start AI Visibility check');
      if (data.alreadyRunning) toast('A check is already running');
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to start AI Visibility check');
    } finally {
      setTriggering(false);
    }
  }

  const engines: Result['engine'][] = ['chatgpt', 'claude', 'perplexity', 'gemini'];
  const engineStats = engines.map((engine) => {
    const engineResults = results.filter((r) => r.engine === engine && !r.error);
    const total = engineResults.length;
    const mentioned = engineResults.filter((r) => r.brand_mentioned).length;
    const cited = engineResults.filter((r) => r.brand_cited).length;
    return { engine, total, mentioned, cited };
  }).filter((s) => s.total > 0);

  if (!loaded) return null;

  return (
    <div>
      {/* Prompts + competitors config */}
      {canManage && (
        <details className="group mb-6" open={prompts.length === 0}>
          <summary className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-700 px-3 py-1.5 rounded-lg cursor-pointer select-none transition-colors list-none [&::-webkit-details-marker]:hidden">
            <span className="material-symbols-outlined text-[15px]">tune</span>
            Prompts &amp; competitors
            <span className="material-symbols-outlined text-[15px] text-gray-400 transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-sm font-semibold text-[#111111] mb-1">Prompts</p>
              <p className="text-xs text-gray-400 mb-3">Buyer-intent questions to test against each engine, e.g. &ldquo;best CRM for startups&rdquo;.</p>
              <form onSubmit={addPrompt} className="flex gap-2 mb-3">
                <input
                  type="text" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="e.g. best marketing agencies in Lucknow"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
                />
                <button type="submit" disabled={addingPrompt || !newPrompt.trim()} className="bg-[#ff724f] text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-[#e8603a] transition-colors disabled:opacity-60 shrink-0">
                  Add
                </button>
              </form>
              <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                {prompts.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="flex-1">{p.prompt_text}</span>
                    <button onClick={() => deletePrompt(p.id)} className="text-gray-400 hover:text-red-600 shrink-0">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </li>
                ))}
                {prompts.length === 0 && <li className="text-xs text-gray-400">No prompts yet.</li>}
              </ul>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-sm font-semibold text-[#111111] mb-1">Competitors</p>
              <p className="text-xs text-gray-400 mb-3">Named brands to compare share-of-voice against (optional).</p>
              <form onSubmit={addCompetitor} className="flex gap-2 mb-3">
                <input
                  type="text" value={newCompetitorName} onChange={(e) => setNewCompetitorName(e.target.value)}
                  placeholder="Competitor name"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
                />
                <input
                  type="text" value={newCompetitorDomain} onChange={(e) => setNewCompetitorDomain(e.target.value)}
                  placeholder="domain.com (optional)"
                  className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
                />
                <button type="submit" disabled={addingCompetitor || !newCompetitorName.trim()} className="bg-[#ff724f] text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-[#e8603a] transition-colors disabled:opacity-60 shrink-0">
                  Add
                </button>
              </form>
              <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                {competitors.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="flex-1">{c.name}{c.domain && <span className="text-gray-400"> — {c.domain}</span>}</span>
                    <button onClick={() => deleteCompetitor(c.id)} className="text-gray-400 hover:text-red-600 shrink-0">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </li>
                ))}
                {competitors.length === 0 && <li className="text-xs text-gray-400">No competitors added.</li>}
              </ul>
            </div>
          </div>
        </details>
      )}

      {/* Run trigger + status */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-[#111111]">Brand: {brandName}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {prompts.length} prompt{prompts.length === 1 ? '' : 's'} × up to 4 engines
            {run && <> · last run {new Date(run.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</>}
          </p>
        </div>
        {canManage && (
          <button
            onClick={triggerRun}
            disabled={triggering || isJobActive(run?.status ?? null) || prompts.length === 0}
            className="flex items-center gap-1.5 bg-[#ff724f] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#e8603a] transition-colors disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[16px] ${triggering || isJobActive(run?.status ?? null) ? 'animate-spin' : ''}`}>
              {triggering || isJobActive(run?.status ?? null) ? 'progress_activity' : 'radar'}
            </span>
            {isJobActive(run?.status ?? null) ? 'Running…' : 'Run AI Visibility check'}
          </button>
        )}
      </div>
      {runError && <p className="text-sm text-red-600 mb-4">{runError}</p>}
      {prompts.length === 0 && <p className="text-sm text-gray-500 mb-4">Add at least one prompt above before running a check.</p>}

      {run && isJobActive(run.status) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-[18px] text-[#ff724f] animate-spin">progress_activity</span>
          <div className="text-sm flex-1">
            <span className="font-medium text-[#111111]">{run.status === 'pending' ? 'Queued…' : 'Checking engines…'}</span>
            {run.total_calls > 0 && <span className="text-gray-400 ml-1.5">{run.completed_calls}/{run.total_calls} calls done</span>}
          </div>
        </div>
      )}
      {run?.status === 'failed' && (
        <p className="text-sm text-red-600 mb-4">Run failed: {run.error ?? 'unknown error'}</p>
      )}

      {/* Engine summary stats */}
      {engineStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {engineStats.map((s) => {
            const meta = ENGINE_META[s.engine];
            return (
              <div key={s.engine} className="bg-white border border-gray-200 rounded-2xl p-4">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.className}`}>
                  <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
                  {meta.label}
                </span>
                <p className="text-2xl font-bold text-[#111111] mt-2">{Math.round((s.mentioned / s.total) * 100)}%</p>
                <p className="text-xs text-gray-400">mentioned ({s.mentioned}/{s.total})</p>
                <p className="text-xs text-gray-500 mt-1">{Math.round((s.cited / s.total) * 100)}% cited</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Results table */}
      {results.length > 0 ? (
        <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-400">
                <th className="px-3 py-2">Prompt</th>
                <th className="px-3 py-2">Engine</th>
                <th className="px-3 py-2">Mentioned</th>
                <th className="px-3 py-2">Cited</th>
                <th className="px-3 py-2">Sentiment</th>
                <th className="px-3 py-2">Competitors mentioned</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const meta = ENGINE_META[r.engine];
                return (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0 align-top">
                    <td className="px-3 py-2 max-w-[240px] text-gray-700">{promptTextOf(r)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.className}`}>
                        <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
                        {meta.label}
                      </span>
                    </td>
                    {r.error ? (
                      <td colSpan={4} className="px-3 py-2 text-red-500">Failed: {r.error}</td>
                    ) : (
                      <>
                        <td className="px-3 py-2">
                          {r.brand_mentioned
                            ? <span className="text-green-600 font-medium">Yes{r.position && <span className="text-gray-400"> ({r.position})</span>}</span>
                            : <span className="text-gray-400">No</span>}
                        </td>
                        <td className="px-3 py-2">
                          {r.brand_cited ? <span className="text-green-600 font-medium">Yes</span> : <span className="text-gray-400">No</span>}
                        </td>
                        <td className="px-3 py-2">
                          {r.sentiment_score !== null ? (
                            <span className={r.sentiment_score > 20 ? 'text-green-600' : r.sentiment_score < -20 ? 'text-red-600' : 'text-gray-500'} title={r.sentiment_justification ?? ''}>
                              {r.sentiment_score > 0 ? '+' : ''}{r.sentiment_score}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {r.competitors_mentioned.length > 0 ? r.competitors_mentioned.join(', ') : <span className="text-gray-300">—</span>}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        !isJobActive(run?.status ?? null) && (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-sm text-gray-500">
            No AI Visibility results yet — add prompts above and run a check.
          </div>
        )
      )}
    </div>
  );
}
