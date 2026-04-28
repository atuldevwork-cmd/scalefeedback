CREATE TABLE support_agents (
  user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at  timestamptz DEFAULT now()
);

ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;

-- Authenticated users can only check their own record (for client-side guards)
CREATE POLICY "agents can check own status" ON support_agents
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Seed by email so this works on every environment (local Docker + production)
INSERT INTO support_agents (user_id)
SELECT id FROM auth.users
WHERE email IN ('atul@scalestation.io', 'atuldevwork@gmail.com')
ON CONFLICT DO NOTHING;
