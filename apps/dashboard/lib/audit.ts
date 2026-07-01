import type { SupabaseClient } from '@supabase/supabase-js';

interface AuditEntry {
  organisation_id: string;
  actor_id?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  details?: Record<string, unknown>;
}

/**
 * Write a single event to org_audit_log.
 * Fire-and-forget — never throws, so it never blocks the calling request.
 */
export async function writeAuditLog(
  service: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  try {
    await service.from('org_audit_log').insert({
      organisation_id: entry.organisation_id,
      actor_id: entry.actor_id ?? null,
      action: entry.action,
      target_type: entry.target_type ?? null,
      target_id: entry.target_id ?? null,
      details: entry.details ?? {},
    });
  } catch {
    // Audit log writes are best-effort — never break the main request
  }
}
