-- AEO (Answer/AI-search Engine Optimization) check — a new monitor_scan_jobs
-- check_type alongside 'broken_links'/'page_speed'/'full_scan', run as its
-- own background worker job (apps/worker/src/aeo.ts) for the same reason
-- page_speed is: a per-page fetch + robots.txt/llms.txt check across a whole
-- site doesn't fit a single 120s serverless request. Entirely deterministic
-- (no AI model call) — see apps/worker/src/aeo.ts for the checks themselves.
ALTER TABLE monitor_scan_jobs DROP CONSTRAINT IF EXISTS monitor_scan_jobs_check_type_check;
ALTER TABLE monitor_scan_jobs ADD CONSTRAINT monitor_scan_jobs_check_type_check
  CHECK (check_type IN ('broken_links', 'page_speed', 'full_scan', 'aeo'));
