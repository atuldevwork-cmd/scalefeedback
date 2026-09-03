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
  aiRewrite?: boolean;
  /** When true, the Title field is hidden for reporters — the server generates one from the description. */
  titleGeneration?: boolean;
  /** Issue types shown in the type picker for guest reporters (no `user` set). Defaults to all 4 when omitted/empty. */
  guestFormTypes?: FeedbackType[];
  /** Issue types shown in the type picker for identified members (`user` is set). Defaults to all 4 when omitted/empty. */
  memberFormTypes?: FeedbackType[];
  /** Extra field visibility for guest reporters (no `user` set) — the same fields for every issue type. Keys among 'title' | 'priority' | 'assignee' | 'dueDate'. Empty/unset falls back to ['title'] (today's default: Title asked, nothing else). */
  guestFormFields?: string[];
  /** Same as guestFormFields, for identified members (`user` is set). */
  memberFormFields?: string[];
  /** Assignable org members, for the Assignee field's dropdown. Only sent by the server when at least one form type has 'assignee' visible. Name only — email is withheld since this config is fetched with a public, unauthenticated project key. */
  assignableMembers?: { id: string; name: string }[];
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
