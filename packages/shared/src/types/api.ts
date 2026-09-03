import type { FeedbackType, FeedbackPriority, ConsoleLog, NetworkLog } from './feedback';

export interface SubmitFeedbackPayload {
  // Project identification
  project_api_key: string;

  // Reporter
  reporter_name?: string;
  reporter_email?: string;

  // Content
  title?: string;
  description?: string;
  type: FeedbackType;

  // Screenshot (base64 data URL)
  screenshot?: string;

  // Technical metadata (auto-captured)
  page_url: string;
  browser: string;
  os: string;
  screen_size: string;
  viewport_size: string;
  device_pixel_ratio: number;
  user_agent: string;

  // Logs
  console_logs: ConsoleLog[];
  network_logs: NetworkLog[];

  // Priority — sent when the widget's "Priority" field is toggled visible for
  // this issue type (Guest Forms / Member Forms > Fields). Persisted for
  // real in apps/dashboard/app/api/feedback/route.ts's baseInsert.
  priority?: FeedbackPriority;

  // Assignee — sent when the widget's "Assignee" field is toggled visible.
  // Must be a user_id from the assignableMembers list the widget-config API
  // returned; the server re-validates org membership before persisting.
  assigned_to?: string;

  // Due date — sent when the widget's "Due date" field is toggled visible.
  // ISO date string (YYYY-MM-DD).
  due_date?: string;

  // Custom metadata
  custom_metadata?: Record<string, unknown>;

  // Session replay — either raw events or gzip+base64 compressed (preferred)
  session_events?: unknown[];
  session_events_gz?: string;
}

// Sent by the widget's server-side snapshot render path (capture/snapshot-render.ts)
// to POST /api/render-snapshot. Response is a raw image/png body, not JSON.
export interface RenderSnapshotRequest {
  project_api_key: string;
  dom_snapshot_gz: string; // gzip+base64 of the rrweb-snapshot serialized DOM tree (JSON)
  page_url: string;
  viewport_width: number;
  viewport_height: number;
  scroll_x: number;
  scroll_y: number;
  device_pixel_ratio: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}
