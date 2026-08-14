export interface WidgetConfig {
  projectApiKey: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'middle-right' | 'middle-left';
  color: string;
  buttonText: string;
  guestReporting: boolean;
  collectConsole: boolean;
  collectNetwork: boolean;
  apiBaseUrl: string;
  audience: 'everyone' | 'members_only';
  pages: 'all' | 'secret_param' | 'hidden';
  secretParamType?: 'default' | 'custom';
  secretParam?: string;
  /** Pre-identify the reporter (e.g. from your own auth). When set, name/email fields are hidden. */
  user?: { name: string; email: string };
  sessionReplay?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onSubmit?: (feedback: { type: string; title?: string; description?: string }) => void;
}

export interface ConsoleLogEntry {
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

export interface NetworkLogEntry {
  url: string;
  method: string;
  status?: number;
  duration?: number;
  error?: string;
  timestamp: number;
}

export type FeedbackType = 'bug' | 'suggestion' | 'question' | 'other';
export type AnnotationTool = 'arrow' | 'rectangle' | 'circle' | 'freehand' | 'highlighter' | 'text' | 'blur' | 'select';
