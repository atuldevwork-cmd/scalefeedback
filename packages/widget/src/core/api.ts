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

export async function submitFeedback(opts: SubmitOptions): Promise<void> {
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
      session_events: opts.sessionEvents ?? null,
      ...collectMetadata(),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Submission failed');
  }
}
