-- Add notification preferences per member
ALTER TABLE members
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"new_feedback": true, "status_change": true, "comments": true}'::jsonb;
