-- The product has always marketed its top tier as "Agency" (see
-- apps/marketing/app/pricing/page.tsx), but the DB/type layer still used the
-- placeholder name "enterprise". Rename it so plan-gating code can check
-- against the real tier names: free < pro < agency.
ALTER TABLE organisations DROP CONSTRAINT IF EXISTS organisations_plan_check;
UPDATE organisations SET plan = 'agency' WHERE plan = 'enterprise';
ALTER TABLE organisations ADD CONSTRAINT organisations_plan_check CHECK (plan IN ('free', 'pro', 'agency'));
