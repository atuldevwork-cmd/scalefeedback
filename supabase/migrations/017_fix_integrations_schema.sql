-- Fix integrations table to match what the codebase expects:
-- 1. Rename 'provider' → 'type' (all API routes use 'type')
-- 2. Rename 'is_active' → 'enabled' (all API routes use 'enabled')
-- 3. Expand CHECK constraint to include 'clickup' and 'webhook'
-- 4. Add unique constraint on (project_id, type) for upsert support

ALTER TABLE integrations RENAME COLUMN provider TO type;
ALTER TABLE integrations RENAME COLUMN is_active TO enabled;

ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;

ALTER TABLE integrations ADD CONSTRAINT integrations_type_check
  CHECK (type IN ('jira', 'trello', 'github', 'linear', 'slack', 'clickup', 'webhook'));

ALTER TABLE integrations ADD CONSTRAINT integrations_project_type_unique
  UNIQUE (project_id, type);
