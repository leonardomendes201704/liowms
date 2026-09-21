import pg from "pg";

const { Pool } = pg;

let runtimePool: pg.Pool | null = null;

export function getRuntimePool(): pg.Pool | null {
  return runtimePool;
}

export function setRuntimePool(pool: pg.Pool | null): void {
  runtimePool = pool;
}

export function createPool(dsn: string): pg.Pool {
  return new Pool({ connectionString: dsn, max: 5 });
}

export async function testDsn(dsn: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const pool = createPool(dsn);
  try {
    await pool.query("SELECT 1");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return { ok: false, message };
  } finally {
    await pool.end();
  }
}

export interface InstallMetaRow {
  install_lock: boolean;
  installed_at: Date | null;
  server_secret: Buffer;
  envelope_salt: Buffer;
  locale: string;
  timezone: string;
  instance_url: string | null;
}

export async function readInstallMeta(
  pool: pg.Pool,
): Promise<InstallMetaRow | null> {
  const tables = await pool.query(
    "SELECT 1 FROM information_schema.tables WHERE table_name = 'install_meta'",
  );
  if (!tables.rowCount) {
    return null;
  }
  const res = await pool.query<InstallMetaRow>(
    `SELECT install_lock, installed_at, server_secret, envelope_salt, locale, timezone, instance_url
     FROM install_meta WHERE id = 1`,
  );
  return res.rows[0] ?? null;
}
