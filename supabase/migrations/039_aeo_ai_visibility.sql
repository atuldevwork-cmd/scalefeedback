-- AI Visibility Tracker (AEO spec Module B/C) — separate data model from
-- monitor_issues: this is brand-level ("does ChatGPT/Claude/Perplexity/
-- Gemini mention or cite us for these prompts"), not page-level, and each
-- prompt gets re-run over time rather than resolved/dismissed like an issue.

-- User-defined prompts to test against each engine, e.g. "best CRM for
-- startups". Kept simple/flat (no categories/tags) for the manual-trigger
-- MVP — see aeo.md Section 9's phased build order.
CREATE TABLE aeo_prompts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id  uuid REFERENCES project_monitors(id) ON DELETE CASCADE NOT NULL,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  prompt_text text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Named competitors to compute share-of-voice against — matched by simple
-- name/domain text search in each engine's response, not an exact science.
CREATE TABLE aeo_competitors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id  uuid REFERENCES project_monitors(id) ON DELETE CASCADE NOT NULL,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  domain      text,
  created_at  timestamptz DEFAULT now()
);

-- One "run" = every configured prompt tested against every configured
-- engine, once. Mirrors monitor_scan_jobs' shape (status/progress columns)
-- so the dashboard can reuse the same polling pattern already built for
-- broken_links/page_speed/aeo.
CREATE TABLE aeo_visibility_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id      uuid REFERENCES project_monitors(id) ON DELETE CASCADE NOT NULL,
  project_id      uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_calls     int NOT NULL DEFAULT 0,
  completed_calls int NOT NULL DEFAULT 0,
  error           text,
  created_at      timestamptz DEFAULT now(),
  completed_at    timestamptz
);

-- One row per (prompt, engine) within a run. brand_mentioned/brand_cited are
-- the two core AEO signals; sentiment is filled in by a follow-up Claude
-- call (Module C) only when brand_mentioned is true — no point classifying
-- sentiment of an answer that never mentions the brand.
CREATE TABLE aeo_prompt_results (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                 uuid REFERENCES aeo_visibility_runs(id) ON DELETE CASCADE NOT NULL,
  monitor_id             uuid REFERENCES project_monitors(id) ON DELETE CASCADE NOT NULL,
  project_id             uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  prompt_id              uuid REFERENCES aeo_prompts(id) ON DELETE CASCADE NOT NULL,
  engine                 text NOT NULL CHECK (engine IN ('chatgpt', 'claude', 'perplexity', 'gemini')),
  run_at                 timestamptz NOT NULL DEFAULT now(),
  raw_response           text,
  cited_urls             jsonb NOT NULL DEFAULT '[]',
  brand_mentioned        boolean NOT NULL DEFAULT false,
  brand_cited            boolean NOT NULL DEFAULT false,
  position               text CHECK (position IN ('early', 'mid', 'late')),
  competitors_mentioned  jsonb NOT NULL DEFAULT '[]',
  sentiment_score        int CHECK (sentiment_score IS NULL OR (sentiment_score >= -100 AND sentiment_score <= 100)),
  sentiment_justification text,
  error                  text
);

CREATE INDEX idx_aeo_prompts_monitor ON aeo_prompts(monitor_id);
CREATE INDEX idx_aeo_competitors_monitor ON aeo_competitors(monitor_id);
CREATE INDEX idx_aeo_visibility_runs_monitor ON aeo_visibility_runs(monitor_id, created_at DESC);
CREATE INDEX idx_aeo_prompt_results_run ON aeo_prompt_results(run_id);
CREATE INDEX idx_aeo_prompt_results_monitor ON aeo_prompt_results(monitor_id, run_at DESC);

-- Same pattern as every other monitor table (migration 027): only the
-- backend (service role) reads/writes these — routes verify project
-- membership manually server-side.
ALTER TABLE aeo_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE aeo_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE aeo_visibility_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE aeo_prompt_results ENABLE ROW LEVEL SECURITY;
