export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackType = 'bug' | 'suggestion' | 'question' | 'other';

export interface Feedback {
  id: string;
  project_id: string;
  assigned_to?: string | null;

  // Reporter
  reporter_name?: string | null;
  reporter_email?: string | null;

  // Content
  title?: string | null;
  description?: string | null;
  type: FeedbackType;
  status: FeedbackStatus;
  priority: FeedbackPriority;

  // Screenshot
  screenshot_url?: string | null;

  // Technical metadata
  page_url: string;
  browser?: string | null;
  os?: string | null;
  screen_size?: string | null;
  viewport_size?: string | null;
  device_pixel_ratio?: number | null;
  user_agent?: string | null;

  // Logs
  console_logs: ConsoleLog[];
  network_logs: NetworkLog[];

  // Custom
  custom_metadata: Record<string, unknown>;

  // External PM tool
  external_id?: string | null;
  external_url?: string | null;

  created_at: string;
  updated_at: string;
}

export interface ConsoleLog {
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  args?: unknown[];
}

export interface NetworkLog {
  url: string;
  method: string;
  status?: number;
  duration?: number;
  error?: string;
  timestamp: number;
}

export interface Comment {
  id: string;
  feedback_id: string;
  user_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface Attachment {
  id: string;
  feedback_id: string;
  file_name: string;
  file_url: string;
  file_size?: number | null;
  mime_type?: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  feedback_id: string;
  user_id?: string | null;
  action: string;
  details?: Record<string, unknown> | null;
  created_at: string;
}
