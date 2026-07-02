-- Track whether a user's welcome email has been sent so /auth/callback
-- can send it exactly once, regardless of how many times they sign in.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;
