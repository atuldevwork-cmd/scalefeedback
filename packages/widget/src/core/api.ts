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

// Gzip-compress session events using the native browser CompressionStream API.
// JSON typically compresses 8-12x, turning a 4MB HubSpot snapshot into ~400KB.
// Returns base64-encoded gzip, or null if the API is unavailable.
async function compressEvents(events: unknown[]): Promise<string | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const json = JSON.stringify(events);
    const bytes = new TextEncoder().encode(json);
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const compressed = await new Response(cs.readable).arrayBuffer();
    // Chunk-encode to avoid call-stack overflow on large arrays
    const arr = new Uint8Array(compressed);
    let binary = '';
    for (let i = 0; i < arr.length; i += 8192) {
      binary += String.fromCharCode(...arr.subarray(i, i + 8192));
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

export async function submitFeedback(opts: SubmitOptions): Promise<void> {
  let sessionEventsGz: string | null = null;
  if (opts.sessionEvents?.length) {
    sessionEventsGz = await compressEvents(opts.sessionEvents);
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
