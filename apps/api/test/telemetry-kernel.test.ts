import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import pg from "pg";
import {
  assertTelemetryExportSafe,
  buildTelemetryExportPayload,
  HEALTH_CONTRACT,
} from "@liowms/shared";
import { buildServer } from "../src/server.js";
import { getRuntimePool, setRuntimePool } from "../src/db/pool.js";
import {
  buildTenantTelemetryExport,
  incrementTelemetryCounter,
} from "../src/telemetry/service.js";

const { Pool } = pg;

const adminDsn = process.env.LIOWMS_TEST_PG_ADMIN_DSN;
if (!adminDsn) {
  throw new Error(
    "Set LIOWMS_TEST_PG_ADMIN_DSN for integration tests (admin Postgres DSN)",
  );
}

const testDb = `liowms_s08_${Date.now()}`;

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

describe("telemetry kernel (WMS-109 / S0.8)", () => {
  let dsn: string;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let tenantA: string;
  let tenantB: string;
  let runtimePool: pg.Pool | null = null;

  before(async () => {
    dsn = await createTestDatabase();
    process.env.DATABASE_URL = dsn;
    app = await buildServer();
    const complete = await app.inject({
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
    assert.equal(complete.statusCode, 200);
    tenantA = complete.json().tenantId as string;
    runtimePool = getRuntimePool();
    assert.ok(runtimePool);
    const ins = await runtimePool.query<{ id: string }>(
      `INSERT INTO tenants (slug, name) VALUES ('tenant-b', 'B') RETURNING id`,
    );
    tenantB = ins.rows[0]!.id;
  });

  after(async () => {
    await app.close();
    await runtimePool?.end();
    setRuntimePool(null);
    delete process.env.DATABASE_URL;
    await dropTestDatabase();
  });

  it("TC-GOLD H-02: health includes queue detail after install", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.contract, HEALTH_CONTRACT);
    assert.equal(body.installed, true);
    assert.match(body.queues.detail, /outbox:worker=/);
    assert.equal(body.migrations.latest, "008_telemetry_s08");
  });

  it("TC-GOLD J12-03: telemetry export is tenant-scoped without PII keys", async () => {
    await incrementTelemetryCounter(tenantA, "notify.sent", 2);
    await incrementTelemetryCounter(tenantB, "notify.sent", 5);
    await incrementTelemetryCounter(tenantA, "ledger.post", 1);

    const exportA = await buildTenantTelemetryExport(tenantA);
    const exportB = await buildTenantTelemetryExport(tenantB);
    assertTelemetryExportSafe(exportA);
    assertTelemetryExportSafe(exportB);

    const totalA = exportA.aggregates.reduce((s, p) => s + p.count, 0);
    const totalB = exportB.aggregates.reduce((s, p) => s + p.count, 0);
    assert.equal(totalA, 3);
    assert.equal(totalB, 5);

    const forbidden = buildTelemetryExportPayload([
      { metricKey: "lot_trace", count: 1 },
    ]);
    assert.equal(forbidden.aggregates.length, 0);
  });
});
