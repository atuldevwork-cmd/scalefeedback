export interface WidgetConfig {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  color: string;
  collectConsole: boolean;
  collectNetwork: boolean;
  guestReporting: boolean;
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
}

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
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
