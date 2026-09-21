import {
  buildTelemetryExportPayload,
  type TelemetryAggregatePoint,
} from "@liowms/shared";
import { withDbScope } from "../db/tenant-scope.js";

export async function incrementTelemetryCounter(
  tenantId: string,
  metricKey: string,
  delta = 1,
): Promise<void> {
  if (!tenantId || delta <= 0) {
    return;
  }
  await withDbScope({ tenantId }, async (client) => {
    await client.query(
      `INSERT INTO telemetry_counters (tenant_id, metric_key, count, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (tenant_id, metric_key) DO UPDATE SET
         count = telemetry_counters.count + EXCLUDED.count,
         updated_at = now()`,
      [tenantId, metricKey, delta],
    );
  });
}

export async function listTenantTelemetryAggregates(
  tenantId: string,
): Promise<TelemetryAggregatePoint[]> {
  return withDbScope({ tenantId }, async (client) => {
    const res = await client.query<{ metric_key: string; count: string }>(
      `SELECT metric_key, count::text FROM telemetry_counters
       WHERE tenant_id = $1
       ORDER BY metric_key`,
      [tenantId],
    );
    return res.rows.map((row) => ({
      metricKey: row.metric_key,
      count: Number(row.count),
    }));
  });
}

export async function buildTenantTelemetryExport(
  tenantId: string,
): Promise<ReturnType<typeof buildTelemetryExportPayload>> {
  const aggregates = await listTenantTelemetryAggregates(tenantId);
  return buildTelemetryExportPayload(aggregates);
}

export async function countTenantOutboxByStatus(
  tenantId: string,
): Promise<{ pending: number; dlq: number }> {
  return withDbScope({ tenantId }, async (client) => {
    const pendingRes = await client.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM notify_outbox
       WHERE tenant_id = $1 AND status IN ('pending', 'failed')`,
      [tenantId],
    );
    const dlqRes = await client.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM notify_outbox
       WHERE tenant_id = $1 AND status = 'dlq'`,
      [tenantId],
    );
    return {
      pending: pendingRes.rows[0]?.c ?? 0,
      dlq: dlqRes.rows[0]?.c ?? 0,
    };
  });
}
