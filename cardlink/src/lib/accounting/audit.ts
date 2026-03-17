import type { SupabaseClient } from "@supabase/supabase-js";

export async function writeAccountingAuditLog(params: {
  supabase: SupabaseClient;
  organizationId: string;
  userId: string;
  action: string;
  tableName: string;
  recordId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
}) {
  await params.supabase.from("audit_log").insert({
    org_id: params.organizationId,
    user_id: params.userId,
    action: params.action,
    table_name: params.tableName,
    record_id: params.recordId ?? null,
    old_values: params.oldValues ?? null,
    new_values: params.newValues ?? null,
  });
}
