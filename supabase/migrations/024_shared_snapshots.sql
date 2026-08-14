-- Ad-hoc screenshot share links (widget "Link" toolbar action) — a standalone
-- public image share, independent of feedback submission entirely.

CREATE TABLE IF NOT EXISTS shared_snapshots (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token        TEXT UNIQUE NOT NULL,
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_snapshots_token ON shared_snapshots(token);

-- RLS: only the backend (service role) reads/writes this table — the widget's
-- share-snapshot route and the public /s/[token] page both use the
-- service-role client, so no anon/authenticated policy is needed.
ALTER TABLE shared_snapshots ENABLE ROW LEVEL SECURITY;
