-- ============================================
-- PROJECTS (one per client website)
-- ============================================

CREATE TABLE projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE NOT NULL,
  name            text NOT NULL,
  domain          text,
  api_key         text UNIQUE DEFAULT ('proj_' || replace(gen_random_uuid()::text, '-', '')),
  widget_config   jsonb DEFAULT '{
    "position": "bottom-right",
    "color": "#7C3AED",
    "collectConsole": true,
    "collectNetwork": false,
    "guestReporting": true
  }'::jsonb,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_projects_organisation ON projects(organisation_id);
CREATE INDEX idx_projects_api_key ON projects(api_key);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
