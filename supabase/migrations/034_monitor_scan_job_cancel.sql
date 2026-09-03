-- Lets a user stop an in-flight broken-link scan instead of waiting for a
-- full site crawl to finish. 'cancelling' is a signal the dashboard sets on
-- a running job — the worker checks for it between progress updates (see
-- apps/worker/src/crawler.ts's onProgress callback) and stops the crawl,
-- then flips the job to 'cancelled' itself once it has unwound. A job still
-- 'pending' (not yet claimed by the worker) can be cancelled directly.
ALTER TABLE monitor_scan_jobs DROP CONSTRAINT IF EXISTS monitor_scan_jobs_status_check;
ALTER TABLE monitor_scan_jobs ADD CONSTRAINT monitor_scan_jobs_status_check
  CHECK (status IN ('pending', 'running', 'cancelling', 'cancelled', 'completed', 'failed'));
