-- Page Speed check (Google PageSpeed Insights) — a new monitor_scan_jobs
-- check_type alongside 'broken_links', run as its own background worker job
-- for the same reason broken_links is: a real per-page Lighthouse audit
-- (5-15s per page via Google's API) doesn't fit a single 120s serverless
-- request across a whole site.
ALTER TABLE monitor_scan_jobs DROP CONSTRAINT IF EXISTS monitor_scan_jobs_check_type_check;
ALTER TABLE monitor_scan_jobs ADD CONSTRAINT monitor_scan_jobs_check_type_check
  CHECK (check_type IN ('broken_links', 'page_speed'));
