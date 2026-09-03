-- Website Monitoring (marker.io-style): on-demand accessibility scans per project,
-- distinct from the ad-hoc AI Scan (which dumps multi-category issues straight into
-- `feedback`). Issues are grouped by axe rule per monitor — not one row per page —
-- so the same violation found on 10 pages shows as a single issue with 10 affected
-- pages, matching "automatic grouping of duplicate issues across pages".
CREATE TABLE IF NOT EXISTS project_monitors (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  target_url      TEXT NOT NULL,
  wcag_level      TEXT NOT NULL DEFAULT 'AA' CHECK (wcag_level IN ('A', 'AA', 'AAA')),
  max_pages       INT NOT NULL DEFAULT 10,
  last_scanned_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitor_issues (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_id     UUID REFERENCES project_monitors(id) ON DELETE CASCADE NOT NULL,
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  rule_id        TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  help_url       TEXT,
  priority       TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  pages          JSONB NOT NULL DEFAULT '[]',
  first_seen_at  TIMESTAMPTZ DEFAULT now(),
  last_seen_at   TIMESTAMPTZ DEFAULT now(),
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (monitor_id, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_monitor_issues_monitor ON monitor_issues(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_issues_project ON monitor_issues(project_id);

-- RLS: only the backend (service role) reads/writes these tables — the monitor
-- config, scan trigger, and issue status routes all verify project membership
-- manually server-side (same pattern as /api/ai-scan), so no anon/authenticated
-- policy is needed.
ALTER TABLE project_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_issues ENABLE ROW LEVEL SECURITY;
