import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import pg from "pg";
import {
  AUTH_HTTP,
  PLATFORM_HTTP,
  SESSION_COOKIE_NAME,
  platformTenantDetailPath,
  platformTenantOffboardPath,
  tenantPlantsPath,
} from "@liowms/shared";
import { buildServer } from "../src/server.js";
import { getRuntimePool, setRuntimePool } from "../src/db/pool.js";

const { Pool } = pg;

const adminDsn = process.env.LIOWMS_TEST_PG_ADMIN_DSN;
if (!adminDsn) {
  throw new Error(
    "Set LIOWMS_TEST_PG_ADMIN_DSN for integration tests (admin Postgres DSN)",
  );
}

const testDb = `liowms_s09_${Date.now()}`;

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

function sessionCookieFromResponse(
  headers: Record<string, string | string[] | undefined>,
): string {
  const setCookie = headers["set-cookie"];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(raw);
  const match = raw.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  assert.ok(match?.[1]);
  return match[1];
}

async function loginAsAdmin(app: Awaited<ReturnType<typeof buildServer>>) {
  const login = await app.inject({
    method: "POST",
    url: AUTH_HTTP.login,
    payload: { email: "admin@example.com", password: "secret-pass" },
  });
  assert.equal(login.statusCode, 200);
  return sessionCookieFromResponse(login.headers);
}

describe("platform S0.9 quotas + offboarding (WMS-32)", () => {
  let dsn: string;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let rootTenantId: string;
  let tenantBId: string;

  before(async () => {
    setRuntimePool(null);
    delete process.env.DATABASE_URL;
    dsn = await createTestDatabase();
    app = await buildServer();
    const install = await app.inject({
      method: "POST",
      url: "/api/v1/install/complete",
      payload: {
        dsn,
        admin: {
          email: "admin@example.com",
          password: "secret-pass",
          displayName: "Super Admin",
        },
        tenant: { slug: "root", name: "Raiz" },
      },
    });
    assert.equal(install.statusCode, 200);
    rootTenantId = install.json().tenantId as string;

    const cookie = await loginAsAdmin(app);
    const created = await app.inject({
      method: "POST",
      url: PLATFORM_HTTP.tenants,
      headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
      payload: { slug: "tenant-b", name: "Tenant B", quotaUsers: 25 },
    });
    assert.equal(created.statusCode, 201);
    tenantBId = created.json().tenant.id as string;
    assert.equal(created.json().tenant.quotaUsers, 25);
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

  it("persists quota on create and patch", async () => {
    const cookie = await loginAsAdmin(app);
    const detail = await app.inject({
      method: "GET",
      url: platformTenantDetailPath(tenantBId),
      headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
    });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json().tenant.quotaUsers, 25);

    const patched = await app.inject({
      method: "PATCH",
      url: platformTenantDetailPath(tenantBId),
      headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
      payload: { quotaUsers: 40 },
    });
    assert.equal(patched.statusCode, 200);
    assert.equal(patched.json().tenant.quotaUsers, 40);
  });

  it("offboard revokes tenant API access and writes audit", async () => {
    const cookie = await loginAsAdmin(app);
    const offboard = await app.inject({
      method: "POST",
      url: platformTenantOffboardPath(tenantBId),
      headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
    });
    assert.equal(offboard.statusCode, 200);
    assert.ok(offboard.json().tenant.deactivatedAt);

    const plants = await app.inject({
      method: "GET",
      url: tenantPlantsPath(tenantBId),
      headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
    });
    assert.equal(plants.statusCode, 403);

    const pool = getRuntimePool();
    assert.ok(pool);
    const audit = await pool.query<{ action: string }>(
      `SELECT action FROM audit.audit_events WHERE tenant_id = $1 ORDER BY occurred_at DESC LIMIT 1`,
      [tenantBId],
    );
    assert.equal(audit.rows[0]?.action, "tenant.offboard");
  });

  it("cannot offboard root tenant", async () => {
    const cookie = await loginAsAdmin(app);
    const res = await app.inject({
      method: "POST",
      url: platformTenantOffboardPath(rootTenantId),
      headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
    });
    assert.equal(res.statusCode, 403);
  });
});
