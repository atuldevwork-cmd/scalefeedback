-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper function: get user's organisation IDs
-- ============================================

CREATE OR REPLACE FUNCTION get_user_organisation_ids(p_user_id uuid)
RETURNS TABLE(organisation_id uuid) AS $$
  SELECT m.organisation_id
  FROM members m
  WHERE m.user_id = p_user_id
    AND m.accepted_at IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- ORGANISATIONS policies
-- ============================================

-- Users can see organisations they belong to
CREATE POLICY "organisations_select" ON organisations
  FOR SELECT USING (
    id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
  );

-- Users can create organisations (they become owner via trigger)
CREATE POLICY "organisations_insert" ON organisations
  FOR INSERT WITH CHECK (true);

-- Only owners/admins can update
CREATE POLICY "organisations_update" ON organisations
  FOR UPDATE USING (
    id IN (
      SELECT organisation_id FROM members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND accepted_at IS NOT NULL
    )
  );

-- ============================================
-- MEMBERS policies
-- ============================================

CREATE POLICY "members_select" ON members
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
  );

CREATE POLICY "members_insert" ON members
  FOR INSERT WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "members_update" ON members
  FOR UPDATE USING (
    organisation_id IN (
      SELECT organisation_id FROM members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "members_delete" ON members
  FOR DELETE USING (
    organisation_id IN (
      SELECT organisation_id FROM members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND accepted_at IS NOT NULL
    )
  );

-- ============================================
-- PROJECTS policies
-- ============================================

CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
  );

CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (
    organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
  );

CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (
    organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
  );

CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (
    organisation_id IN (
      SELECT organisation_id FROM members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND accepted_at IS NOT NULL
    )
  );

-- ============================================
-- FEEDBACK policies
-- ============================================

-- Team members can read all feedback for their projects
CREATE POLICY "feedback_select" ON feedback
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
    )
  );

-- Widget inserts via API key (anon role) — handled via service role in API route
-- Team members can also insert
CREATE POLICY "feedback_insert" ON feedback
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
    )
  );

-- Team members can update status, priority, assignment
CREATE POLICY "feedback_update" ON feedback
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
    )
  );

-- Admins/owners can delete feedback
CREATE POLICY "feedback_delete" ON feedback
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.organisation_id IN (
        SELECT organisation_id FROM members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND accepted_at IS NOT NULL
      )
    )
  );

-- ============================================
-- COMMENTS policies
-- ============================================

CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (
    feedback_id IN (
      SELECT f.id FROM feedback f
      JOIN projects p ON p.id = f.project_id
      WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
    )
  );

CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (
    feedback_id IN (
      SELECT f.id FROM feedback f
      JOIN projects p ON p.id = f.project_id
      WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
    )
    AND user_id = auth.uid()
  );

-- ============================================
-- ATTACHMENTS policies
-- ============================================

CREATE POLICY "attachments_select" ON attachments
  FOR SELECT USING (
    feedback_id IN (
      SELECT f.id FROM feedback f
      JOIN projects p ON p.id = f.project_id
      WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
    )
  );

-- ============================================
-- ACTIVITY LOG policies
-- ============================================

CREATE POLICY "activity_log_select" ON activity_log
  FOR SELECT USING (
    feedback_id IN (
      SELECT f.id FROM feedback f
      JOIN projects p ON p.id = f.project_id
      WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
    )
  );

-- ============================================
-- INTEGRATIONS policies
-- ============================================

CREATE POLICY "integrations_select" ON integrations
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
    )
  );

CREATE POLICY "integrations_insert" ON integrations
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.organisation_id IN (
        SELECT organisation_id FROM members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND accepted_at IS NOT NULL
      )
    )
  );

CREATE POLICY "integrations_update" ON integrations
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.organisation_id IN (
        SELECT organisation_id FROM members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND accepted_at IS NOT NULL
      )
    )
  );

-- ============================================
-- Supabase Storage: screenshots bucket policy
-- ============================================

-- This is configured in the Supabase dashboard or via API:
-- Bucket: 'screenshots' (public for reading, authenticated writes)
-- INSERT: allow service_role only (widget submits via backend API)
-- SELECT: allow authenticated users whose projects own the screenshot
