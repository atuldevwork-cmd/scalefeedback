-- Historical accessibility score per scan — lets the Accessibility tab show
-- a trend over time ("Aug 1: 41, Jul 1: 92, ...") instead of just the latest
-- snapshot. One row per scan that had 'accessibility' enabled, written by
-- the scan route right after axe-core findings are computed (see
-- computeAccessibilityScore in apps/dashboard/lib/monitor.ts).
CREATE TABLE monitor_accessibility_scores (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id     uuid REFERENCES project_monitors(id) ON DELETE CASCADE NOT NULL,
  project_id     uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  score          int NOT NULL CHECK (score >= 0 AND score <= 100),
  failed_checks  int NOT NULL DEFAULT 0,
  pages_scanned  int NOT NULL DEFAULT 0,
  scanned_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_monitor_accessibility_scores_monitor ON monitor_accessibility_scores(monitor_id, scanned_at DESC);

-- Same pattern as project_monitors/monitor_issues (migration 027): only the
-- backend (service role) reads/writes this — the scan route verifies project
-- membership manually server-side, so no anon/authenticated policy is needed.
ALTER TABLE monitor_accessibility_scores ENABLE ROW LEVEL SECURITY;
