import type { SupabaseClient } from '@supabase/supabase-js';

export type ActivityAction =
  | 'feedback.created'
  | 'status.changed'
  | 'priority.changed'
  | 'assignee.changed'
  | 'comment.added';

export interface ActivityEntry {
  id: string;
  feedback_id: string;
  actor: string;
  action: ActivityAction;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function logActivity(
  supabase: SupabaseClient,
  {
    feedbackId,
    actor,
    action,
    metadata = {},
  }: {
    feedbackId: string;
    actor: string;
    action: ActivityAction;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await supabase.from('activity_log').insert({
      feedback_id: feedbackId,
      actor,
      action,
      metadata,
    });
  } catch { /* activity log failures must never break the main flow */ }
}
