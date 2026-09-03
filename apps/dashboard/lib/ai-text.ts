import Anthropic from '@anthropic-ai/sdk';

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function extractJson(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response did not contain a JSON object');
  return JSON.parse(match[0]) as Record<string, unknown>;
}

const REWRITE_SYSTEM_PROMPT = `You clean up bug reports submitted through a website feedback widget.

Given a raw title and description, produce:
- A concise, actionable title (max 80 chars) that summarises the issue — always generate a fresh one, even if a title was already provided.
- A clearly structured description: fix grammar and spelling, organise it so a developer or QA person can act on it quickly, but preserve the reporter's original tone and language (do NOT translate).
- Any phrase wrapped in double quotes in the original text must appear unchanged, verbatim, in your output.

Return ONLY a JSON object: {"title": "...", "description": "..."}`;

export async function rewriteFeedbackText(
  { title, description }: { title?: string; description?: string }
): Promise<{ title: string; description: string }> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: REWRITE_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Title: ${title ?? '(none)'}\nDescription: ${description ?? '(none)'}`,
    }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  const parsed = extractJson(text);
  if (typeof parsed.title !== 'string' || typeof parsed.description !== 'string') {
    throw new Error('AI rewrite response missing title/description');
  }

  return { title: parsed.title.slice(0, 80), description: parsed.description };
}

function translateSystemPrompt(targetLanguage: string): string {
  return `You detect the language of an incoming bug report and translate it to ${targetLanguage} for a support team's dashboard.

Given a title and description:
- If the text is already in ${targetLanguage}, return {"isTargetLanguage": true}.
- Otherwise, detect the source language and translate both fields to ${targetLanguage}, preserving meaning and tone.

Return ONLY a JSON object, either:
{"isTargetLanguage": true}
or
{"isTargetLanguage": false, "detectedLanguage": "Spanish", "title": "...", "description": "..."}`;
}

export async function translateFeedbackText(
  { title, description }: { title?: string; description?: string },
  targetLanguage: string = 'English'
): Promise<{ detectedLanguage: string; title: string; description: string } | null> {
  if (!title && !description) return null;

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: translateSystemPrompt(targetLanguage),
    messages: [{
      role: 'user',
      content: `Title: ${title ?? '(none)'}\nDescription: ${description ?? '(none)'}`,
    }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  const parsed = extractJson(text);

  if (parsed.isTargetLanguage === true) return null;

  if (
    typeof parsed.detectedLanguage !== 'string' ||
    typeof parsed.title !== 'string' ||
    typeof parsed.description !== 'string'
  ) {
    throw new Error('AI translate response missing required fields');
  }

  return {
    detectedLanguage: parsed.detectedLanguage,
    title: parsed.title,
    description: parsed.description,
  };
}

const TITLE_SYSTEM_PROMPT = `You write short, clear titles for bug reports submitted through a website feedback widget.

Given a description, produce a concise, actionable title (max 80 chars) that summarises the issue for a developer or QA person triaging a backlog.

Return ONLY a JSON object: {"title": "..."}`;

export async function generateFeedbackTitle(description: string): Promise<string> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: TITLE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Description: ${description}` }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  const parsed = extractJson(text);
  if (typeof parsed.title !== 'string') {
    throw new Error('AI title response missing title');
  }

  return parsed.title.slice(0, 80);
}
