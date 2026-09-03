export interface WidgetConfig {
  position: 'middle-right' | 'middle-left' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  color: string;
  collectConsole: boolean;
  collectNetwork: boolean;
  guestReporting: boolean;
  // Screen Capture settings (Project Settings > Screen Capture). These are
  // plain booleans, not secrets — the Basic Auth credentials themselves live
  // in dedicated `projects` columns (basic_auth_username/basic_auth_password),
  // never in widget_config, since widget_config is exposed verbatim by the
  // public /api/widget-config endpoint.
  basicAuthEnabled?: boolean;
  nativeScreenshotApi?: boolean;
  authenticatedMediaCapture?: boolean;
  // Developer Tools settings (Project Settings > Developer Tools).
  // collectConsole/collectNetwork above are the real, widget-consumed toggles.
  // The fields below are settings-only today — see developer-tools-panel.tsx
  // header comment for what's wired end-to-end vs. persisted-but-inert.
  networkExcludedKeys?: string[];
  networkExcludedDomains?: string[];
  customMetadataEnabled?: boolean;
  // Guest Forms / Member Forms settings (Project Settings). Each is the list
  // of enabled issue-type keys ('bug' | 'suggestion' | 'question' | 'other')
  // for that audience — defaults to all 4 (current always-on behavior) when
  // omitted or empty. See issue-types-panel.tsx.
  guestFormTypes?: string[];
  memberFormTypes?: string[];
  // Guest Forms / Member Forms > Fields (Project Settings). For each of the 4
  // issue types (keyed by FeedbackType), the extra fields visible on that
  // type's submission form for this audience — among 'title' | 'priority' |
  // 'assignee' | 'dueDate'. A type missing from the map (or the whole map
  // being undefined) falls back to ['title'] rather than [] — that's today's
  // actual default widget behavior (a Title field is always asked unless AI
  // title-generation is on; Priority/Assignee/Due date have never been
  // asked), so projects that haven't touched the new Fields UI keep behaving
  // exactly as before. Title and Priority are wired end-to-end
  // (packages/widget/src/core/widget.ts renders real inputs and
  // /api/feedback persists them); Assignee/Due date are settings-only — see
  // issue-fields-editor.tsx for why. See issue-types-panel.tsx.
  guestFormFields?: Record<string, string[]>;
  memberFormFields?: Record<string, string[]>;
}

export interface Project {
  id: string;
  organisation_id: string;
  name: string;
  domain?: string | null;
  api_key: string;
  widget_config: WidgetConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Basic Auth credentials for server-side screenshot rendering — dedicated,
  // non-public columns (see migration 029). Never selected by the public
  // /api/widget-config endpoint.
  basic_auth_username?: string | null;
  basic_auth_password?: string | null;
}

export interface AiSettings {
  translate_enabled: boolean;
  team_language: string;
  title_generation_enabled: boolean;
  magic_rewrite_enabled: boolean;
}

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'agency';
  ai_settings: AiSettings;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  organisation_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_at: string;
  accepted_at?: string | null;
}

export interface Integration {
  id: string;
  project_id: string;
  provider: 'jira' | 'trello' | 'github' | 'linear' | 'slack';
  config: Record<string, unknown>;
  is_active: boolean;
  auto_push: boolean;
  created_at: string;
}
