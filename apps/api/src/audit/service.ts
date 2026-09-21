import type { AuditEventRecord, AuditEventsListQuery } from "@liowms/shared";
import { withDbScope } from "../db/tenant-scope.js";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function rowToRecord(row: {
  id: string;
  tenant_id: string;
  occurred_at: Date;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_key: string;
  before_json: unknown;
  after_json: unknown;
}): AuditEventRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    occurredAt: row.occurred_at.toISOString(),
    actorUserId: row.actor_user_id,
    action: row.action,
    entityType: row.entity_type,
    entityKey: row.entity_key,
    beforeJson: (row.before_json as Record<string, unknown> | null) ?? null,
    afterJson: (row.after_json as Record<string, unknown> | null) ?? null,
  };
}

export async function listTenantAuditEvents(
  tenantId: string,
  query: AuditEventsListQuery,
): Promise<{ events: AuditEventRecord[]; page: number; limit: number; total: number }> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  const conditions: string[] = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];
  let paramIdx = 2;

  if (query.actor?.trim()) {
    conditions.push(`actor_user_id = $${paramIdx}::uuid`);
    params.push(query.actor.trim());
    paramIdx += 1;
  }
  if (query.entityType?.trim()) {
    conditions.push(`entity_type = $${paramIdx}`);
    params.push(query.entityType.trim());
    paramIdx += 1;
  }
  if (query.from?.trim()) {
    conditions.push(`occurred_at >= $${paramIdx}::timestamptz`);
    params.push(query.from.trim());
    paramIdx += 1;
  }
  if (query.to?.trim()) {
    conditions.push(`occurred_at <= $${paramIdx}::timestamptz`);
    params.push(query.to.trim());
    paramIdx += 1;
  }

  const where = conditions.join(" AND ");

  return withDbScope({ tenantId }, async (client) => {
    const countRes = await client.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM audit.audit_events WHERE ${where}`,
      params,
    );
    const total = countRes.rows[0]?.c ?? 0;

    const listParams = [...params, limit, offset];
    const res = await client.query(
      `SELECT id, tenant_id, occurred_at, actor_user_id, action, entity_type,
              entity_key, before_json, after_json
       FROM audit.audit_events
       WHERE ${where}
       ORDER BY occurred_at DESC, id DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      listParams,
    );

    return {
      events: res.rows.map(rowToRecord),
      page,
      limit,
      total,
    };
  });
}
