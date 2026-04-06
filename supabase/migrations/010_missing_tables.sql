-- Migration: Add missing tables (profiles, notifications, user_notification_preferences,
-- api_keys, integration_logs, tags, feedback_tags, saved_filters, feedback_votes,
-- subscriptions, org_audit_log)

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (id = auth.uid());

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_id uuid REFERENCES public.feedback(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_own ON public.notifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY notifications_select ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_insert ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY notifications_update ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- user_notification_preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_feedback boolean DEFAULT true,
  status_change boolean DEFAULT true,
  comments boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_prefs_select ON public.user_notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notif_prefs_insert ON public.user_notification_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY notif_prefs_update ON public.user_notification_preferences FOR UPDATE USING (user_id = auth.uid());

-- api_keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  last_used timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_keys_select ON public.api_keys FOR SELECT USING (user_id = auth.uid());
CREATE POLICY api_keys_insert ON public.api_keys FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY api_keys_delete ON public.api_keys FOR DELETE USING (user_id = auth.uid());

-- subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT USING (
  organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
);
CREATE POLICY subscriptions_insert ON public.subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY subscriptions_update ON public.subscriptions FOR UPDATE USING (true);

-- org_audit_log
CREATE TABLE IF NOT EXISTS public.org_audit_log (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.org_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_audit_select ON public.org_audit_log FOR SELECT USING (
  organisation_id IN (
    SELECT organisation_id FROM members
    WHERE user_id = auth.uid() AND role = ANY(ARRAY['owner','admin']) AND accepted_at IS NOT NULL
  )
);
CREATE POLICY org_audit_insert ON public.org_audit_log FOR INSERT WITH CHECK (true);

-- tags
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#7C3AED',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tags_select ON public.tags FOR SELECT USING (
  organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
);
CREATE POLICY tags_insert ON public.tags FOR INSERT WITH CHECK (
  organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
);
CREATE POLICY tags_update ON public.tags FOR UPDATE USING (
  organisation_id IN (
    SELECT organisation_id FROM members
    WHERE user_id = auth.uid() AND role = ANY(ARRAY['owner','admin']) AND accepted_at IS NOT NULL
  )
);
CREATE POLICY tags_delete ON public.tags FOR DELETE USING (
  organisation_id IN (
    SELECT organisation_id FROM members
    WHERE user_id = auth.uid() AND role = ANY(ARRAY['owner','admin']) AND accepted_at IS NOT NULL
  )
);

-- feedback_tags
CREATE TABLE IF NOT EXISTS public.feedback_tags (
  feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  tagged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tagged_at timestamptz DEFAULT now(),
  PRIMARY KEY (feedback_id, tag_id)
);
ALTER TABLE public.feedback_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_tags_select ON public.feedback_tags FOR SELECT USING (
  feedback_id IN (
    SELECT f.id FROM feedback f JOIN projects p ON p.id = f.project_id
    WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
  )
);
CREATE POLICY feedback_tags_insert ON public.feedback_tags FOR INSERT WITH CHECK (
  feedback_id IN (
    SELECT f.id FROM feedback f JOIN projects p ON p.id = f.project_id
    WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
  )
);
CREATE POLICY feedback_tags_delete ON public.feedback_tags FOR DELETE USING (
  feedback_id IN (
    SELECT f.id FROM feedback f JOIN projects p ON p.id = f.project_id
    WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
  )
);

-- saved_filters
CREATE TABLE IF NOT EXISTS public.saved_filters (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}',
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_filters_select ON public.saved_filters FOR SELECT USING (
  user_id = auth.uid() OR (
    is_shared = true AND project_id IN (
      SELECT p.id FROM projects p
      WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
    )
  )
);
CREATE POLICY saved_filters_insert ON public.saved_filters FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY saved_filters_update ON public.saved_filters FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY saved_filters_delete ON public.saved_filters FOR DELETE USING (user_id = auth.uid());

-- feedback_votes
CREATE TABLE IF NOT EXISTS public.feedback_votes (
  feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (feedback_id, user_id)
);
ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_votes_select ON public.feedback_votes FOR SELECT USING (
  feedback_id IN (
    SELECT f.id FROM feedback f JOIN projects p ON p.id = f.project_id
    WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
  )
);
CREATE POLICY feedback_votes_insert ON public.feedback_votes FOR INSERT WITH CHECK (
  user_id = auth.uid() AND feedback_id IN (
    SELECT f.id FROM feedback f JOIN projects p ON p.id = f.project_id
    WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
  )
);
CREATE POLICY feedback_votes_delete ON public.feedback_votes FOR DELETE USING (user_id = auth.uid());

-- integration_logs
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.integrations(id) ON DELETE SET NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  feedback_id uuid REFERENCES public.feedback(id) ON DELETE SET NULL,
  type text NOT NULL,
  success boolean NOT NULL,
  status_code integer,
  error_message text,
  duration_ms integer,
  triggered_at timestamptz DEFAULT now()
);
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY integration_logs_select ON public.integration_logs FOR SELECT USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.organisation_id IN (SELECT organisation_id FROM get_user_organisation_ids(auth.uid()))
  )
);
CREATE POLICY integration_logs_insert ON public.integration_logs FOR INSERT WITH CHECK (true);
