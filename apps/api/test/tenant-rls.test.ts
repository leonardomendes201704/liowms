import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import pg from "pg";
import {
  AUTH_HTTP,
  PLATFORM_HTTP,
  SESSION_COOKIE_NAME,
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

const testDb = `liowms_wms91_${Date.now()}`;

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

describe("tenant RLS (WMS-91 / J12-01)", () => {
  let dsn: string;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let rootTenantId: string;
  let tenantBId: string;
  let plantBId: string;

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
      payload: { slug: "tenant-b", name: "Tenant B" },
    });
    assert.equal(created.statusCode, 201);
    tenantBId = created.json().tenant.id as string;

    const plant = await app.inject({
      method: "POST",
      url: tenantPlantsPath(tenantBId),
      headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
      payload: { slug: "planta-b", name: "Planta B" },
    });
    assert.equal(plant.statusCode, 201);
    plantBId = plant.json().plant.id as string;

    const pool = getRuntimePool();
    assert.ok(pool);
    await pool.query(
      `INSERT INTO tenant_memberships (tenant_id, user_id, role)
       SELECT $1, id, 'tenant_admin' FROM platform_users WHERE email = $2`,
      [rootTenantId, "admin@example.com"],
    );
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

  it("TC-GOLD J12-01 cross-tenant GET returns 403", async () => {
    const cookie = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/tenants/${rootTenantId}/plants/${plantBId}`,
      headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().code, "AUTH_FORBIDDEN");
  });

  it("TC-GOLD J12-01 cross-tenant PATCH returns 403", async () => {
    const cookie = await loginAsAdmin(app);
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/tenants/${rootTenantId}/plants/${plantBId}`,
      headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
      payload: { name: "Hack" },
    });
    assert.equal(res.statusCode, 403);
  });

  it("tenant admin can read plant in own tenant path", async () => {
    const cookie = await loginAsAdmin(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/tenants/${tenantBId}/plants/${plantBId}`,
      headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().plant.slug, "planta-b");
  });
});
