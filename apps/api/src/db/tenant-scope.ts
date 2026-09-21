import type { PoolClient } from "pg";
import { getRuntimePool } from "./pool.js";

export async function withDbScope<T>(
  scope: { tenantId?: string; bypassRls?: boolean },
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getRuntimePool();
  if (!pool) {
    throw new Error("DATABASE_UNAVAILABLE");
  }
  const client = await pool.connect();
  try {
    if (scope.bypassRls) {
      await client.query(`SELECT set_config('app.rls_bypass', '1', true)`);
    } else if (scope.tenantId) {
      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [
        scope.tenantId,
      ]);
    }
    return await fn(client);
  } finally {
    client.release();
  }
}
