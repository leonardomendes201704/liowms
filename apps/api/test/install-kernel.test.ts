import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import pg from "pg";
import { buildServer } from "../src/server.js";
import { getRuntimePool, setRuntimePool } from "../src/db/pool.js";
import { HEALTH_CONTRACT } from "@liowms/shared";

const { Pool } = pg;

const adminDsn = process.env.LIOWMS_TEST_PG_ADMIN_DSN;
if (!adminDsn) {
  throw new Error(
    "Set LIOWMS_TEST_PG_ADMIN_DSN for integration tests (admin Postgres DSN)",
  );
}

const testDb = `liowms_wms87_${Date.now()}`;

function databaseDsn(dbName: string): string {
  const url = new URL(adminDsn!);
  url.pathname = `/${dbName}`;
  return url.toString();
}

async function createTestDatabase(): Promise<string> {
  const pool = new Pool({ connectionString: adminDsn });
  await pool.query(`CREATE DATABASE "${testDb}"`);
  await pool.end();
  return databaseDsn(testDb);
}

async function dropTestDatabase(): Promise<void> {
  const pool = new Pool({ connectionString: adminDsn });
  await pool.query(`DROP DATABASE IF EXISTS "${testDb}" WITH (FORCE)`);
  await pool.end();
}

describe("install kernel (WMS-87)", () => {
  let dsn: string;
  let app: Awaited<ReturnType<typeof buildServer>>;

  before(async () => {
    setRuntimePool(null);
    delete process.env.DATABASE_URL;
    dsn = await createTestDatabase();
    app = await buildServer();
  });

  after(async () => {
    await app.close();
    const pool = getRuntimePool();
    if (pool) {
      await pool.end();
    }
    setRuntimePool(null);
    await dropTestDatabase();
  });

  it("TC-GOLD J0-02: GET /health before install (H-4)", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.contract, HEALTH_CONTRACT);
    assert.equal(body.installed, false);
    assert.equal(body.phase, "uninstalled");
    assert.equal(body.service, "liowms-api");
    assert.ok(body.migrations);
    assert.ok(body.queues);
  });

  it("TC-GOLD J0-04: migration failure rolls back without install_lock", async () => {
    process.env.LIOWMS_INSTALL_FAIL_MIGRATION = "1";
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/install/complete",
      payload: {
        dsn,
        admin: {
          email: "admin@example.com",
          password: "secret-pass",
          displayName: "Admin",
        },
        tenant: { slug: "root", name: "Raiz" },
      },
    });
    delete process.env.LIOWMS_INSTALL_FAIL_MIGRATION;
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().screen, "K4");

    const pool = new Pool({ connectionString: dsn });
    const tables = await pool.query(
      "SELECT to_regclass('public.install_meta') AS r",
    );
    assert.equal(tables.rows[0]?.r, null);
    await pool.end();

    const health = await app.inject({ method: "GET", url: "/health" });
    assert.equal(health.json().installed, false);
  });

  it("happy path: complete install sets install_lock", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/install/complete",
      payload: {
        dsn,
        admin: {
          email: "admin@example.com",
          password: "secret-pass",
          displayName: "Admin",
        },
        tenant: { slug: "root", name: "Raiz" },
      },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().installLock, true);

    const health = await app.inject({ method: "GET", url: "/health" });
    assert.equal(health.json().installed, true);

    const blocked = await app.inject({
      method: "POST",
      url: "/api/v1/install/dsn/test",
      payload: { dsn },
    });
    assert.equal(blocked.statusCode, 404);
    assert.equal(blocked.json().screen, "K4");
  });
});
