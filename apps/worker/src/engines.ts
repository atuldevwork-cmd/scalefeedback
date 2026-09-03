// Calls each of the 4 LLM engines with web-search/grounding enabled (where
// the provider offers it) so responses can actually cite live sources — a
// plain chat completion without search grounding would never produce a real
// citation to compare against. Every parser here is written defensively
// (optional chaining, try/catch, empty-array fallbacks) since provider
// response shapes shift over time and this couldn't be tested against a
// live key while writing it — verify against a real run once keys are set.
//
// IMPORTANT: engine calls cost real money per prompt per run. Keep prompt
// counts and run frequency deliberate — this is a manual-trigger feature
// (Phase 2 of the AEO build spec), not scheduled/automatic.

export interface EngineCallResult {
  ok: boolean;
  responseText: string;
  citedUrls: string[];
  error?: string;
}

const FETCH_TIMEOUT_MS = 45_000;

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<{ ok: boolean; status: number; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await resp.json().catch(() => null);
    return { ok: resp.ok, status: resp.status, json };
  } finally {
    clearTimeout(timer);
  }
}

// ─── OpenAI (ChatGPT) ───────────────────────────────────────────────────────
// Responses API with the built-in web_search tool — plain chat completions
// have no live web access and would never cite a source.
export async function callOpenAI(prompt: string, apiKey: string): Promise<EngineCallResult> {
  try {
    const { ok, status, json } = await postJson(
      'https://api.openai.com/v1/responses',
      { Authorization: `Bearer ${apiKey}` },
      { model: 'gpt-4o', tools: [{ type: 'web_search_preview' }], input: prompt }
    );
    if (!ok) {
      const message = (json as { error?: { message?: string } })?.error?.message ?? `HTTP ${status}`;
      return { ok: false, responseText: '', citedUrls: [], error: message };
    }
    const output = (json as { output?: unknown[] })?.output ?? [];
    let text = '';
    const citedUrls: string[] = [];
    for (const item of output) {
      const obj = item as { type?: string; content?: unknown[] };
      if (obj?.type !== 'message' || !Array.isArray(obj.content)) continue;
      for (const part of obj.content) {
        const p = part as { type?: string; text?: string; annotations?: unknown[] };
        if (p?.type !== 'output_text') continue;
        text += (p.text ?? '') + '\n';
        for (const ann of p.annotations ?? []) {
          const a = ann as { type?: string; url?: string };
          if (a?.type === 'url_citation' && typeof a.url === 'string') citedUrls.push(a.url);
        }
      }
    }
    return { ok: true, responseText: text.trim(), citedUrls };
  } catch (err) {
    return { ok: false, responseText: '', citedUrls: [], error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Anthropic (Claude) ─────────────────────────────────────────────────────
// Messages API with the web_search server tool.
export async function callClaude(prompt: string, apiKey: string): Promise<EngineCallResult> {
  try {
    const { ok, status, json } = await postJson(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 1536,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }
    );
    if (!ok) {
      const message = (json as { error?: { message?: string } })?.error?.message ?? `HTTP ${status}`;
      return { ok: false, responseText: '', citedUrls: [], error: message };
    }
    const content = (json as { content?: unknown[] })?.content ?? [];
    let text = '';
    const citedUrls: string[] = [];
    for (const block of content) {
      const b = block as { type?: string; text?: string; citations?: unknown[] };
      if (b?.type !== 'text') continue;
      text += (b.text ?? '') + '\n';
      for (const c of b.citations ?? []) {
        const cite = c as { url?: string };
        if (typeof cite?.url === 'string') citedUrls.push(cite.url);
      }
    }
    return { ok: true, responseText: text.trim(), citedUrls };
  } catch (err) {
    return { ok: false, responseText: '', citedUrls: [], error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Perplexity ─────────────────────────────────────────────────────────────
// Search-grounded by default (that's the whole product) — returns a
// top-level `citations` array alongside the usual chat-completions shape.
export async function callPerplexity(prompt: string, apiKey: string): Promise<EngineCallResult> {
  try {
    const { ok, status, json } = await postJson(
      'https://api.perplexity.ai/chat/completions',
      { Authorization: `Bearer ${apiKey}` },
      { model: 'sonar', messages: [{ role: 'user', content: prompt }] }
    );
    if (!ok) {
      const message = (json as { error?: { message?: string } })?.error?.message ?? `HTTP ${status}`;
      return { ok: false, responseText: '', citedUrls: [], error: message };
    }
    const data = json as { choices?: { message?: { content?: string } }[]; citations?: string[] };
    const text = data?.choices?.[0]?.message?.content ?? '';
    const citedUrls = (data?.citations ?? []).filter((u): u is string => typeof u === 'string');
    return { ok: true, responseText: text.trim(), citedUrls };
  } catch (err) {
    return { ok: false, responseText: '', citedUrls: [], error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Google (Gemini) ────────────────────────────────────────────────────────
// Generative Language API with Google Search grounding enabled.
export async function callGemini(prompt: string, apiKey: string): Promise<EngineCallResult> {
  try {
    const { ok, status, json } = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {},
      { contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }] }
    );
    if (!ok) {
      const message = (json as { error?: { message?: string } })?.error?.message ?? `HTTP ${status}`;
      return { ok: false, responseText: '', citedUrls: [], error: message };
    }
    const candidate = (json as { candidates?: unknown[] })?.candidates?.[0] as
      { content?: { parts?: { text?: string }[] }; groundingMetadata?: { groundingChunks?: { web?: { uri?: string } }[] } } | undefined;
    const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? '').join('\n').trim();
    const citedUrls = (candidate?.groundingMetadata?.groundingChunks ?? [])
      .map((c) => c.web?.uri)
      .filter((u): u is string => typeof u === 'string');
    return { ok: true, responseText: text, citedUrls };
  } catch (err) {
    return { ok: false, responseText: '', citedUrls: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export type EngineName = 'chatgpt' | 'claude' | 'perplexity' | 'gemini';

export const ENGINE_CALLERS: Record<EngineName, (prompt: string, apiKey: string) => Promise<EngineCallResult>> = {
  chatgpt: callOpenAI,
  claude: callClaude,
  perplexity: callPerplexity,
  gemini: callGemini,
};

// ─── Brand / competitor signal detection ───────────────────────────────────
// Deterministic text matching — no AI call. Sentiment (the one genuinely
// judgment-based signal) is a separate, explicit follow-up call — see
// classifySentiment in index.ts, only run when brandMentioned is true.

function hostnameOf(domainOrUrl: string): string | null {
  try {
    const url = domainOrUrl.startsWith('http') ? domainOrUrl : `https://${domainOrUrl}`;
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

export interface BrandSignals {
  mentioned: boolean;
  cited: boolean;
  position: 'early' | 'mid' | 'late' | null;
}

export function detectBrandSignals(responseText: string, citedUrls: string[], brandName: string, brandDomain: string): BrandSignals {
  const lowerText = responseText.toLowerCase();
  const lowerBrand = brandName.trim().toLowerCase();
  const mentioned = lowerBrand.length > 0 && lowerText.includes(lowerBrand);

  const brandHost = hostnameOf(brandDomain);
  const cited = brandHost !== null && citedUrls.some((u) => hostnameOf(u)?.includes(brandHost));

  let position: BrandSignals['position'] = null;
  if (mentioned && lowerText.length > 0) {
    const idx = lowerText.indexOf(lowerBrand);
    const frac = idx / lowerText.length;
    position = frac < 0.33 ? 'early' : frac < 0.66 ? 'mid' : 'late';
  }
  return { mentioned, cited, position };
}

// ─── Sentiment classification (Module C) ───────────────────────────────────
// The one genuinely judgment-based signal — everything else in this file is
// deterministic text matching. Only called for results where the brand was
// actually mentioned (classifying sentiment of an answer that never
// mentions the brand is meaningless). Uses Claude regardless of which
// engine produced the response being classified — one classifier keeps
// sentiment scores comparable across engines.
export async function classifySentiment(responseText: string, brandName: string, apiKey: string): Promise<{ score: number; justification: string } | null> {
  try {
    const { ok, json } = await postJson(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `Given this AI-generated answer, does it describe "${brandName}" positively, neutrally, or negatively?\n\nAnswer:\n${responseText.slice(0, 4_000)}\n\nRespond with ONLY a JSON object, no other text: {"score": <number from -100 to 100>, "justification": "<one sentence>"}`,
        }],
      }
    );
    if (!ok) return null;
    const textBlock = (json as { content?: { type?: string; text?: string }[] })?.content?.find((b) => b.type === 'text');
    const raw = textBlock?.text ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as { score?: unknown; justification?: unknown };
    if (typeof parsed.score !== 'number' || Number.isNaN(parsed.score)) return null;
    return {
      score: Math.max(-100, Math.min(100, Math.round(parsed.score))),
      justification: String(parsed.justification ?? '').slice(0, 300),
    };
  } catch {
    return null;
  }
}

export function detectCompetitorsMentioned(
  responseText: string,
  citedUrls: string[],
  competitors: { name: string; domain: string | null }[]
): string[] {
  const lowerText = responseText.toLowerCase();
  const found: string[] = [];
  for (const c of competitors) {
    const lowerName = c.name.trim().toLowerCase();
    const nameHit = lowerName.length > 0 && lowerText.includes(lowerName);
    const domainHost = c.domain ? hostnameOf(c.domain) : null;
    const domainHit = domainHost !== null && citedUrls.some((u) => hostnameOf(u)?.includes(domainHost));
    if (nameHit || domainHit) found.push(c.name);
  }
  return found;
}
