import type { ConsoleLogEntry, NetworkLogEntry, FeedbackType } from '../types';
import { collectMetadata } from '../capture/metadata';

export interface SubmitOptions {
  apiBaseUrl: string;
  projectApiKey: string;
  screenshot?: string;
  reporterName?: string;
  reporterEmail?: string;
  title?: string;
  description?: string;
  type: FeedbackType;
  consoleLogs: ConsoleLogEntry[];
  networkLogs: NetworkLogEntry[];
  customMetadata?: Record<string, unknown>;
  sessionEvents?: unknown[];
}

// Trim session events to fit under Vercel's 4.5MB body limit.
// Finds the last FullSnapshot (type 2) and keeps from there onward.
function trimEvents(events: unknown[]): unknown[] | null {
  const MAX_BYTES = 2_000_000; // 2MB budget for events alone
  if (JSON.stringify(events).length <= MAX_BYTES) return events;

  for (let i = events.length - 1; i >= 0; i--) {
    if ((events[i] as { type: number }).type === 2) {
      // Include preceding Meta event (type 4) if present
      const start = i > 0 && (events[i - 1] as { type: number }).type === 4 ? i - 1 : i;
      const trimmed = events.slice(start);
      if (JSON.stringify(trimmed).length <= MAX_BYTES) return trimmed;
    }
  }
  return null; // no usable snapshot fits — drop events rather than 413
}

export async function submitFeedback(opts: SubmitOptions): Promise<void> {
  const sessionEvents = opts.sessionEvents?.length
    ? trimEvents(opts.sessionEvents)
    : null;

  const response = await fetch(`${opts.apiBaseUrl}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_api_key: opts.projectApiKey,
      screenshot: opts.screenshot,
      reporter_name: opts.reporterName,
      reporter_email: opts.reporterEmail,
      title: opts.title,
      description: opts.description,
      type: opts.type,
      console_logs: opts.consoleLogs,
      network_logs: opts.networkLogs,
      custom_metadata: opts.customMetadata ?? {},
      session_events: sessionEvents,
      ...collectMetadata(),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Submission failed');
  }
}
