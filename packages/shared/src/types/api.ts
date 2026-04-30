import type { FeedbackType, ConsoleLog, NetworkLog } from './feedback';

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

  // Custom metadata
  custom_metadata?: Record<string, unknown>;

  // Session replay (rrweb events, last 30s before submission)
  session_events?: unknown[];
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
