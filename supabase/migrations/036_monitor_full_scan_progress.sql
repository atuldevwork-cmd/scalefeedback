-- Real progress tracking for the synchronous monitor scan (accessibility,
-- SEO, legal, content quality, brand consistency, custom checks) — unlike
-- broken_links/page_speed, this work runs inline in the scan API route
-- rather than as a background worker job, so there was previously no way to
-- report per-category progress back to the dashboard while it's in flight.
--
-- Reuses monitor_scan_jobs purely as a shared progress-polling row: the scan
-- route itself writes to `phases` as each category starts/finishes, and the
-- dashboard polls it exactly like the worker-driven jobs (see
-- apps/dashboard/app/api/monitor/[projectId]/scan-jobs/route.ts) — giving
-- real per-category status, not a simulated timer.
ALTER TABLE monitor_scan_jobs DROP CONSTRAINT IF EXISTS monitor_scan_jobs_check_type_check;
ALTER TABLE monitor_scan_jobs ADD CONSTRAINT monitor_scan_jobs_check_type_check
  CHECK (check_type IN ('broken_links', 'page_speed', 'full_scan'));

-- { [phaseKey]: 'pending' | 'running' | 'completed' }, e.g.
-- { "crawling": "completed", "accessibility": "completed", "seo": "running",
--   "legal": "pending", "content_quality": "pending" }
-- Only 'full_scan' jobs use this column; NULL for broken_links/page_speed.
ALTER TABLE monitor_scan_jobs ADD COLUMN phases jsonb;
