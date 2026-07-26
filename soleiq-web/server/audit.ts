import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditInput {
  organizationId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  patientId?: string | null;
  purpose: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}

export async function writeAudit(
  supabase: SupabaseClient,
  event: AuditInput
) {
  const { error } = await supabase.rpc("write_audit_event", {
    event_organization_id: event.organizationId,
    event_action: event.action,
    event_resource_type: event.resourceType,
    event_resource_id: event.resourceId ?? null,
    event_patient_id: event.patientId ?? null,
    event_purpose: event.purpose,
    event_request_id: event.requestId,
    event_metadata: event.metadata ?? {},
  });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}

