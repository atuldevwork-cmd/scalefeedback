-- ============================================
-- INVITATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE NOT NULL,
  email           text NOT NULL,
  role            text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  token           uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  invited_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at     timestamptz,
  expires_at      timestamptz DEFAULT now() + interval '7 days',
  created_at      timestamptz DEFAULT now(),
  UNIQUE(organisation_id, email)
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_org   ON invitations(organisation_id);
CREATE INDEX idx_invitations_email ON invitations(email);

-- RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Org owners and admins can view/create invitations for their org
CREATE POLICY "members can view org invitations" ON invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.organisation_id = invitations.organisation_id
        AND members.user_id = auth.uid()
        AND members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "admins can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.organisation_id = invitations.organisation_id
        AND members.user_id = auth.uid()
        AND members.role IN ('owner', 'admin')
    )
  );

-- Service role can do anything (needed for accepting invites)
CREATE POLICY "service role full access" ON invitations
  USING (true)
  WITH CHECK (true);
