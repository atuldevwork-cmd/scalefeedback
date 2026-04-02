-- ============================================
-- ORGANISATIONS & TEAMS
-- ============================================

CREATE TABLE organisations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  plan        text DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_at      timestamptz DEFAULT now(),
  accepted_at     timestamptz,
  UNIQUE(organisation_id, user_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organisations_updated_at
  BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
