-- Background scan jobs for Website Monitor checks that need to crawl far more
-- of a site than a single Vercel serverless request (120s maxDuration) can
-- cover — starting with broken links. A separate worker process (initially
-- run locally, later on Railway) polls this table and does the actual crawl
-- with no time limit, writing results into monitor_issues directly and
-- reporting progress back here for the dashboard to poll.
--
-- `check_type` is intentionally not constrained to a single value — this
-- table is designed to carry other long-running check kinds later
-- (deep accessibility/SEO crawls, wider AI-check sampling) without a new
-- migration, so the CHECK below only guards against typos, not future kinds.
CREATE TABLE monitor_scan_jobs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id     uuid REFERENCES project_monitors(id) ON DELETE CASCADE NOT NULL,
  project_id     uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  check_type     text NOT NULL CHECK (check_type IN ('broken_links')),
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  pages_crawled  int NOT NULL DEFAULT 0,
  links_checked  int NOT NULL DEFAULT 0,
  issues_found   int NOT NULL DEFAULT 0,
  error          text,
  created_at     timestamptz DEFAULT now(),
  started_at     timestamptz,
  completed_at   timestamptz,
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_monitor_scan_jobs_status ON monitor_scan_jobs(status, created_at);
CREATE INDEX idx_monitor_scan_jobs_monitor ON monitor_scan_jobs(monitor_id, created_at DESC);

CREATE TRIGGER update_monitor_scan_jobs_updated_at
  BEFORE UPDATE ON monitor_scan_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
