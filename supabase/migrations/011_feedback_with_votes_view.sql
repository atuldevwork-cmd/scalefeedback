CREATE OR REPLACE VIEW public.feedback_with_votes AS
SELECT f.id, f.project_id, f.assigned_to, f.reporter_name, f.reporter_email,
  f.title, f.description, f.type, f.status, f.priority, f.screenshot_url,
  f.page_url, f.browser, f.os, f.screen_size, f.viewport_size,
  f.device_pixel_ratio, f.user_agent, f.console_logs, f.network_logs,
  f.custom_metadata, f.external_id, f.external_url, f.created_at, f.updated_at,
  COUNT(fv.user_id) AS vote_count
FROM feedback f
LEFT JOIN feedback_votes fv ON fv.feedback_id = f.id
GROUP BY f.id;
