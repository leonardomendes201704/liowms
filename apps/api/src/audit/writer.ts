import type { PoolClient } from "pg";

export interface AppendAuditEventInput {
  tenantId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityKey: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
}

export async function appendAuditEvent(
  client: PoolClient,
  input: AppendAuditEventInput,
): Promise<void> {
  await client.query(
    `INSERT INTO audit.audit_events (
       tenant_id, actor_user_id, action, entity_type, entity_key,
       before_json, after_json
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
    [
      input.tenantId,
      input.actorUserId,
      input.action,
      input.entityType,
      input.entityKey,
      input.beforeJson ? JSON.stringify(input.beforeJson) : null,
      input.afterJson ? JSON.stringify(input.afterJson) : null,
    ],
  );
}
