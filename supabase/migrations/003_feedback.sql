-- ============================================
-- FEEDBACK (core entity)
-- ============================================

CREATE TYPE feedback_status AS ENUM (
  'open', 'in_progress', 'resolved', 'closed', 'wont_fix'
);

CREATE TYPE feedback_priority AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TYPE feedback_type AS ENUM (
  'bug', 'suggestion', 'question', 'other'
);

CREATE TABLE feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  assigned_to     uuid REFERENCES auth.users(id),

  -- Reporter info (may be anonymous guest)
  reporter_name   text,
  reporter_email  text,

  -- Content
  title           text,
  description     text,
  type            feedback_type DEFAULT 'bug',
  status          feedback_status DEFAULT 'open',
  priority        feedback_priority DEFAULT 'medium',

  -- Screenshot
  screenshot_url  text,

  -- Technical metadata (auto-captured by widget)
  page_url        text NOT NULL,
  browser         text,
  os              text,
  screen_size     text,
  viewport_size   text,
  device_pixel_ratio numeric,
  user_agent      text,

  -- Console & network logs (JSON)
  console_logs    jsonb DEFAULT '[]'::jsonb,
  network_logs    jsonb DEFAULT '[]'::jsonb,

  -- Custom metadata (passed via widget SDK)
  custom_metadata jsonb DEFAULT '{}'::jsonb,

  -- External PM tool reference
  external_id     text,
  external_url    text,

  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_feedback_project ON feedback(project_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);
CREATE INDEX idx_feedback_assigned ON feedback(assigned_to);

CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS (threaded discussion per feedback)
-- ============================================

CREATE TABLE comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id   uuid REFERENCES feedback(id) ON DELETE CASCADE NOT NULL,
  user_id       uuid REFERENCES auth.users(id),
  body          text NOT NULL,
  is_internal   boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_comments_feedback ON comments(feedback_id);

-- ============================================
-- ATTACHMENTS (additional files per feedback)
-- ============================================

CREATE TABLE attachments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id   uuid REFERENCES feedback(id) ON DELETE CASCADE NOT NULL,
  file_name     text NOT NULL,
  file_url      text NOT NULL,
  file_size     bigint,
  mime_type     text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_attachments_feedback ON attachments(feedback_id);

-- ============================================
-- ACTIVITY LOG (audit trail)
-- ============================================

CREATE TABLE activity_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id   uuid REFERENCES feedback(id) ON DELETE CASCADE NOT NULL,
  user_id       uuid REFERENCES auth.users(id),
  action        text NOT NULL,
  details       jsonb,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_feedback ON activity_log(feedback_id);
