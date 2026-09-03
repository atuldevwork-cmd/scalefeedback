-- Monitor now runs more than accessibility checks (broken links, SEO & AI-search,
-- legal/privacy compliance) — tag each issue with which category produced it so
-- the UI can group/filter/badge them instead of showing everything as one bucket.
ALTER TABLE monitor_issues
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'accessibility'
  CHECK (category IN ('accessibility', 'broken_links', 'seo', 'legal'));

CREATE INDEX IF NOT EXISTS idx_monitor_issues_category ON monitor_issues(category);
