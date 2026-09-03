-- Captures which future check category a user is most interested in, surfaced
-- as a dropdown on the Monitor setup form. Only "Accessibility & WCAG" is
-- actually implemented today — the rest (broken links, content quality, legal/
-- privacy, SEO & AI-search, brand consistency, custom checks) are roadmap
-- signal only, matching marker.io's own coming-soon categories.
ALTER TABLE project_monitors ADD COLUMN IF NOT EXISTS interested_check TEXT;
