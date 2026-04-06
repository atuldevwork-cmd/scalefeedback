-- ============================================
-- Auto-create organisation when user signs up
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id uuid;
  org_slug text;
BEGIN
  -- Generate a slug from the user's email or name
  org_slug := lower(
    regexp_replace(
      split_part(NEW.email, '@', 1),
      '[^a-z0-9]', '-', 'g'
    )
  ) || '-' || substr(replace(NEW.id::text, '-', ''), 1, 6);

  -- Create a personal organisation
  INSERT INTO organisations (name, slug, plan)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
    org_slug,
    'free'
  )
  RETURNING id INTO new_org_id;

  -- Add user as owner
  INSERT INTO members (organisation_id, user_id, role, accepted_at)
  VALUES (new_org_id, NEW.id, 'owner', now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger fires after a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
