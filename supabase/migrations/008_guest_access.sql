-- ============================================
-- 008: Guest Access
-- Adds guest_secret to projects + project_guests table + RPC
-- ============================================

-- 1. Add guest_secret column to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS guest_secret uuid DEFAULT gen_random_uuid() UNIQUE;

-- 2. Create project_guests table
CREATE TABLE IF NOT EXISTS project_guests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  email       text NOT NULL,
  name        text,
  token       uuid DEFAULT gen_random_uuid() UNIQUE,
  expires_at  timestamptz NOT NULL,
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(project_id, email)
);

-- 3. RLS on project_guests
ALTER TABLE project_guests ENABLE ROW LEVEL SECURITY;

-- Org members can see guests for their projects
CREATE POLICY "project_guests_select" ON project_guests
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.organisation_id IN (
        SELECT organisation_id FROM get_user_organisation_ids(auth.uid())
      )
    )
  );

-- Only org owners/admins can insert/update/delete guests
CREATE POLICY "project_guests_insert" ON project_guests
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN members m ON m.organisation_id = p.organisation_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
        AND m.accepted_at IS NOT NULL
    )
  );

CREATE POLICY "project_guests_delete" ON project_guests
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN members m ON m.organisation_id = p.organisation_id
      WHERE m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
        AND m.accepted_at IS NOT NULL
    )
  );

-- 4. SECURITY DEFINER RPC — lets anon/guest users look up a project by its secret
--    without being able to read the secret column directly via RLS
CREATE OR REPLACE FUNCTION get_project_by_guest_secret(p_secret uuid)
RETURNS TABLE(id uuid, name text) AS $$
  SELECT p.id, p.name
  FROM projects p
  WHERE p.guest_secret = p_secret;
$$ LANGUAGE sql SECURITY DEFINER;
