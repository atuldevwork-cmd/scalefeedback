-- Monitor's "Which additional checks would you like next?" checkboxes now
-- actually gate which checks run, and 3 of them (content quality/typos,
-- brand consistency, AI custom checks) are real AI-powered checks instead of
-- roadmap-only signal (see apps/dashboard/lib/monitor.ts).

ALTER TABLE monitor_issues DROP CONSTRAINT IF EXISTS monitor_issues_category_check;
ALTER TABLE monitor_issues ADD CONSTRAINT monitor_issues_category_check
  CHECK (category IN ('accessibility', 'broken_links', 'seo', 'legal', 'content_quality', 'brand_consistency', 'custom'));

-- Free-text instructions for the "AI custom checks" option.
ALTER TABLE project_monitors ADD COLUMN IF NOT EXISTS custom_check_prompt TEXT;
