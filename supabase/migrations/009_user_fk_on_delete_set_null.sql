-- Fix FK constraints that referenced auth.users(id) without ON DELETE action.
-- These caused "Database error deleting user" when deleting an account.

ALTER TABLE feedback
  DROP CONSTRAINT IF EXISTS feedback_assigned_to_fkey,
  ADD CONSTRAINT feedback_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE comments
  DROP CONSTRAINT IF EXISTS comments_user_id_fkey,
  ADD CONSTRAINT comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE activity_log
  DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey,
  ADD CONSTRAINT activity_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
