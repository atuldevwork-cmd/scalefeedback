import type { ConsoleLogEntry, NetworkLogEntry, FeedbackType } from '../types';
import { collectMetadata } from '../capture/metadata';
import { gzipToBase64 } from './gzip';

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
  /** Sent only when the "Priority" field is visible for this issue type (Guest Forms / Member Forms > Fields). */
  priority?: string;
  /** Sent only when the "Assignee" field is visible for this issue type. A user_id from config.assignableMembers. */
  assignedTo?: string;
  /** Sent only when the "Due date" field is visible for this issue type. ISO date string (YYYY-MM-DD). */
  dueDate?: string;
}

export async function submitFeedback(opts: SubmitOptions): Promise<void> {
  let sessionEventsGz: string | null = null;
  if (opts.sessionEvents?.length) {
    sessionEventsGz = await gzipToBase64(opts.sessionEvents);
  }

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
      priority: opts.priority,
      assigned_to: opts.assignedTo,
      due_date: opts.dueDate,
      // Send gzip-compressed events; server decompresses before storing.
      // Falls back to null if CompressionStream is unavailable.
      session_events_gz: sessionEventsGz,
      ...collectMetadata(),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Submission failed');
  }
}

// Sends the current title/description to Claude for cleanup + title generation
// (Pro+ only — the widget only shows the trigger button when config.aiRewrite is true).
export async function improveFeedbackText(
  apiBaseUrl: string,
  projectApiKey: string,
  title: string,
  description: string
): Promise<{ title: string; description: string }> {
  const response = await fetch(`${apiBaseUrl}/api/ai-rewrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_api_key: projectApiKey, title, description }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Failed to improve text');
  }

  return response.json();
}

// Uploads the current annotated screenshot and returns a public share URL —
// a standalone action independent of feedback submission (the "Link" toolbar button).
export async function shareSnapshot(apiBaseUrl: string, projectApiKey: string, screenshot: string): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/api/share-snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_api_key: projectApiKey, screenshot }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Failed to create share link');
  }

  const data = await response.json();
  return data.url as string;
}
