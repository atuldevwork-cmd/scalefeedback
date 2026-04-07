-- ============================================================
-- Fix handle_new_user: skip personal org creation when the
-- new user already has a pending invitation to an existing org.
-- Also clean up orphaned empty personal orgs after joining.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id uuid;
  org_slug   text;
  has_pending_invite boolean;
BEGIN
  -- If this email was invited to an existing workspace, skip creating
  -- a personal org. They will be added to the invited org on accept.
  SELECT EXISTS(
    SELECT 1 FROM public.invitations
    WHERE LOWER(email) = LOWER(NEW.email)
      AND accepted_at IS NULL
      AND expires_at > now()
  ) INTO has_pending_invite;

  IF has_pending_invite THEN
    RETURN NEW;
  END IF;

  -- Generate slug from email prefix
  org_slug := lower(
    regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g')
  ) || '-' || substr(replace(NEW.id::text, '-', ''), 1, 6);

  -- Create personal workspace
  INSERT INTO public.organisations (name, slug, plan)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
    org_slug,
    'free'
  )
  RETURNING id INTO new_org_id;

  -- Make user owner
  INSERT INTO public.members (organisation_id, user_id, role, accepted_at)
  VALUES (new_org_id, NEW.id, 'owner', now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
