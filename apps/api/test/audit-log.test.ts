import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import pg from "pg";
import {
  AUTH_HTTP,
  SECRET_MASK,
  SESSION_COOKIE_NAME,
  SMTP_PLAIN_KEYS,
  SMTP_SECRET_KEYS,
  TENANT_AUDIT_HTTP,
  TENANT_CONTEXT_HEADER,
  TENANT_SETTINGS_HTTP,
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

const testDb = `liowms_wms97_${Date.now()}`;
const SMTP_PASSWORD = "smtp-audit-secret-97";

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

describe("audit log (WMS-97 / J0d-02 + writer smoke)", () => {
  let dsn: string;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let tenantId: string;
  let userId: string;
  let cookie: string;

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
    tenantId = install.json().tenantId as string;

    const login = await app.inject({
      method: "POST",
      url: AUTH_HTTP.login,
      payload: { email: "admin@example.com", password: "secret-pass" },
    });
    assert.equal(login.statusCode, 200);
    cookie = sessionCookieFromResponse(login.headers);
    userId = (login.json() as { user: { id: string } }).user.id;
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

  it("TC-GOLD J0d-02: audit-events rejects PATCH/DELETE (405)", async () => {
    const headers = {
      cookie: `${SESSION_COOKIE_NAME}=${cookie}`,
      [TENANT_CONTEXT_HEADER]: tenantId,
    };
    const patch = await app.inject({
      method: "PATCH",
      url: TENANT_AUDIT_HTTP.events,
      headers,
      payload: { action: "tamper" },
    });
    assert.equal(patch.statusCode, 405);

    const del = await app.inject({
      method: "DELETE",
      url: TENANT_AUDIT_HTTP.events,
      headers,
    });
    assert.equal(del.statusCode, 405);
  });

  it("TC-GOLD J0d-02: DB trigger blocks UPDATE on audit_events", async () => {
    const pool = getRuntimePool()!;
    const row = await pool.query<{ id: string }>(
      `SELECT id FROM audit.audit_events LIMIT 1`,
    );
    if (!row.rowCount) {
      await app.inject({
        method: "PATCH",
        url: TENANT_SETTINGS_HTTP.settings,
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${cookie}`,
          [TENANT_CONTEXT_HEADER]: tenantId,
        },
        payload: {
          plain: { [SMTP_PLAIN_KEYS.host]: "smtp.seed.example.com" },
        },
      });
    }
    const idRes = await pool.query<{ id: string }>(
      `SELECT id FROM audit.audit_events LIMIT 1`,
    );
    assert.equal(idRes.rowCount, 1);
    const eventId = idRes.rows[0].id;
    await assert.rejects(
      () =>
        pool.query(
          `UPDATE audit.audit_events SET action = 'hacked' WHERE id = $1`,
          [eventId],
        ),
      /append-only/,
    );
  });

  it("writer smoke: PATCH settings appends redacted audit event", async () => {
    const patch = await app.inject({
      method: "PATCH",
      url: TENANT_SETTINGS_HTTP.settings,
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${cookie}`,
        [TENANT_CONTEXT_HEADER]: tenantId,
      },
      payload: {
        plain: {
          [SMTP_PLAIN_KEYS.host]: "smtp.audit.example.com",
          [SMTP_PLAIN_KEYS.port]: 465,
        },
        secrets: {
          [SMTP_SECRET_KEYS.password]: SMTP_PASSWORD,
        },
      },
    });
    assert.equal(patch.statusCode, 200);
    assert.ok(!patch.payload.includes(SMTP_PASSWORD));

    const list = await app.inject({
      method: "GET",
      url: `${TENANT_AUDIT_HTTP.events}?entity_type=config_setting`,
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${cookie}`,
        [TENANT_CONTEXT_HEADER]: tenantId,
      },
    });
    assert.equal(list.statusCode, 200);
    const body = list.json() as {
      events: {
        actorUserId: string | null;
        entityType: string;
        afterJson: Record<string, unknown>;
      }[];
      total: number;
    };
    assert.ok(body.total >= 1);
    const latest = body.events[0];
    assert.equal(latest.actorUserId, userId);
    assert.equal(latest.entityType, "config_setting");
    assert.equal(latest.afterJson[SMTP_SECRET_KEYS.password], SECRET_MASK);
    const serialized = JSON.stringify(body);
    assert.ok(!serialized.includes(SMTP_PASSWORD));
  });
});
