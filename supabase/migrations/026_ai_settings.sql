-- Per-org AI feature controls, surfaced at /settings/ai. Translation and Magic
-- Rewrite already ship gated purely on plan (see app/api/feedback/route.ts and
-- app/api/widget-config/route.ts) — this adds an admin-facing on/off switch (and
-- a target language for translation) on top of that plan gate, plus a new
-- title-generation toggle. Defaults preserve today's behaviour: translation and
-- magic rewrite stay on for existing Pro/Agency orgs; title generation is new
-- and starts off until an admin opts in.
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS ai_settings jsonb NOT NULL DEFAULT '{
  "translate_enabled": true,
  "team_language": "English",
  "title_generation_enabled": false,
  "magic_rewrite_enabled": true
}'::jsonb;
