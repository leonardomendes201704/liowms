import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import pg from "pg";
import {
  AUTH_HTTP,
  SESSION_COOKIE_NAME,
  SMTP_PLAIN_KEYS,
  SMTP_SECRET_KEYS,
  TENANT_NOTIFY_HTTP,
  TENANT_SETTINGS_HTTP,
} from "@liowms/shared";
import { buildServer } from "../src/server.js";
import { getRuntimePool, setRuntimePool } from "../src/db/pool.js";
import { processNotifyOutboxOnce } from "../src/notify/worker.js";

const { Pool } = pg;

const adminDsn = process.env.LIOWMS_TEST_PG_ADMIN_DSN;
if (!adminDsn) {
  throw new Error(
    "Set LIOWMS_TEST_PG_ADMIN_DSN for integration tests (admin Postgres DSN)",
  );
}

const testDb = `liowms_s07_${Date.now()}`;

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

async function completeInstall(
  app: Awaited<ReturnType<typeof buildServer>>,
  dsn: string,
) {
  const res = await app.inject({
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
  assert.equal(res.statusCode, 200);
  return res.json() as { tenantId: string };
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

describe("notify outbox (WMS-106 / S0.7)", () => {
  let dsn: string;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let tenantId: string;
  let sessionCookie: string;

  before(async () => {
    process.env.LIOWMS_NOTIFY_DISABLE_WORKER = "1";
    process.env.LIOWMS_SMTP_JSON_TRANSPORT = "1";
    setRuntimePool(null);
    delete process.env.DATABASE_URL;
    dsn = await createTestDatabase();
    app = await buildServer();
    const installed = await completeInstall(app, dsn);
    tenantId = installed.tenantId;

    const login = await app.inject({
      method: "POST",
      url: AUTH_HTTP.login,
      payload: { email: "admin@example.com", password: "secret-pass" },
    });
    assert.equal(login.statusCode, 200);
    sessionCookie = sessionCookieFromResponse(login.headers);
  });

  after(async () => {
    await app.close();
    const pool = getRuntimePool();
    if (pool) {
      await pool.end();
    }
    setRuntimePool(null);
    delete process.env.LIOWMS_NOTIFY_DISABLE_WORKER;
    delete process.env.LIOWMS_SMTP_JSON_TRANSPORT;
    await dropTestDatabase();
  });

  it("delivers invite via json transport worker (J0c-01 hook)", async () => {
    const patch = await app.inject({
      method: "PATCH",
      url: TENANT_SETTINGS_HTTP.settings,
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}`,
        "x-liowms-tenant-id": tenantId,
      },
      payload: {
        plain: {
          [SMTP_PLAIN_KEYS.host]: "smtp.example.com",
          [SMTP_PLAIN_KEYS.port]: 587,
          [SMTP_PLAIN_KEYS.user]: "smtp-user",
          [SMTP_PLAIN_KEYS.from]: "noreply@example.com",
        },
        secrets: {
          [SMTP_SECRET_KEYS.password]: "smtp-secret",
        },
      },
    });
    assert.equal(patch.statusCode, 200);

    const invite = await app.inject({
      method: "POST",
      url: AUTH_HTTP.invites,
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}`,
        "x-liowms-tenant-id": tenantId,
      },
      payload: {
        email: "invitee@example.com",
        tenantId,
        role: "operator",
      },
    });
    assert.equal(invite.statusCode, 200);

    await processNotifyOutboxOnce();

    const pool = getRuntimePool();
    assert.ok(pool);
    const sent = await pool.query<{ status: string }>(
      `SELECT status FROM notify_outbox WHERE kind = 'user_invite' ORDER BY created_at DESC LIMIT 1`,
    );
    assert.equal(sent.rows[0]?.status, "sent");
  });

  it("K14 lists active queue read-only and supports DLQ retry", async () => {
    const pool = getRuntimePool();
    assert.ok(pool);
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO notify_outbox (kind, payload, tenant_id, status, attempts, last_error, dlq_at)
       VALUES ('user_invite', '{"to":"x@example.com"}'::jsonb, $1, 'dlq', 5, 'simulated', now())
       RETURNING id`,
      [tenantId],
    );
    const dlqId = inserted.rows[0].id;

    const list = await app.inject({
      method: "GET",
      url: `${TENANT_NOTIFY_HTTP.outbox}?queue=dlq`,
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}`,
        "x-liowms-tenant-id": tenantId,
      },
    });
    assert.equal(list.statusCode, 200);
    const body = list.json() as { items: { id: string; payloadSummary: Record<string, unknown> }[] };
    assert.ok(body.items.some((item) => item.id === dlqId));
    assert.equal(body.items.find((i) => i.id === dlqId)?.payloadSummary.to, "x@example.com");

    const retry = await app.inject({
      method: "POST",
      url: TENANT_NOTIFY_HTTP.retry(dlqId),
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}`,
        "x-liowms-tenant-id": tenantId,
      },
    });
    assert.equal(retry.statusCode, 200);

    const row = await pool.query<{ status: string }>(
      `SELECT status FROM notify_outbox WHERE id = $1`,
      [dlqId],
    );
    assert.equal(row.rows[0]?.status, "pending");
  });
});
