-- ============================================
-- INTEGRATIONS (PM tool connections)
-- ============================================

CREATE TABLE integrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  provider        text NOT NULL CHECK (provider IN ('jira', 'trello', 'github', 'linear', 'slack')),
  config          jsonb NOT NULL DEFAULT '{}'::jsonb,
  access_token    text,
  is_active       boolean DEFAULT true,
  auto_push       boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_integrations_project ON integrations(project_id);
