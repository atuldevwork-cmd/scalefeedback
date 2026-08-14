-- Migrations run as the `postgres` role, but this project's default privileges
-- (set for `supabase_admin`-created objects) never covered objects created by
-- `postgres`. Every table ended up with no SELECT/INSERT/UPDATE grants for
-- anon/authenticated/service_role, so even RLS-bypassing service-role queries
-- (e.g. the org-membership check in app/(dashboard)/projects/page.tsx) failed
-- with "permission denied" and silently fell through to /no-access.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure tables/sequences/routines created by future `postgres`-run migrations
-- get the same grants automatically.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
