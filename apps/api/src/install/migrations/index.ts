import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool, PoolClient } from "pg";

type DbQueryable = Pick<Pool, "query">;

const __dirname = dirname(fileURLToPath(import.meta.url));

export const MIGRATION_VERSIONS = [
  "001_install_kernel",
  "002_auth_session",
  "003_tenant_rls",
] as const;
export const LATEST_MIGRATION = MIGRATION_VERSIONS[MIGRATION_VERSIONS.length - 1];

function loadSql(version: string): string {
  return readFileSync(join(__dirname, `${version}.sql`), "utf8");
}

/** Test hook for TC-GOLD J0-04 (simulated migration failure). */
export function shouldSimulateMigrationFailure(): boolean {
  return process.env.LIOWMS_INSTALL_FAIL_MIGRATION === "1";
}

export async function runMigrations(client: PoolClient): Promise<void> {
  if (shouldSimulateMigrationFailure()) {
    throw new Error("Simulated migration failure (LIOWMS_INSTALL_FAIL_MIGRATION)");
  }
  for (const version of MIGRATION_VERSIONS) {
    const reg = await client.query<{ r: string | null }>(
      "SELECT to_regclass('public.schema_migrations') AS r",
    );
    if (reg.rows[0]?.r) {
      const applied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE version = $1",
        [version],
      );
      if (applied.rowCount && applied.rowCount > 0) {
        continue;
      }
    }
    await client.query(loadSql(version));
  }
}

export async function countAppliedMigrations(
  client: DbQueryable,
): Promise<number> {
  const tables = await client.query(
    "SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations'",
  );
  if (!tables.rowCount) {
    return 0;
  }
  const res = await client.query(
    "SELECT COUNT(*)::int AS c FROM schema_migrations",
  );
  return res.rows[0]?.c ?? 0;
}
