import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import pg from "pg";
import { AUTH_HTTP, SESSION_COOKIE_NAME } from "@liowms/shared";
import { buildServer } from "../src/server.js";
import { getRuntimePool, setRuntimePool } from "../src/db/pool.js";
import { redactSecrets } from "../src/logging.js";

const { Pool } = pg;

const adminDsn = process.env.LIOWMS_TEST_PG_ADMIN_DSN;
if (!adminDsn) {
  throw new Error(
    "Set LIOWMS_TEST_PG_ADMIN_DSN for integration tests (admin Postgres DSN)",
  );
}

const testDb = `liowms_wms89_${Date.now()}`;

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

describe("auth session (WMS-89)", () => {
  let dsn: string;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let tenantId: string;

  before(async () => {
    setRuntimePool(null);
    delete process.env.DATABASE_URL;
    dsn = await createTestDatabase();
    app = await buildServer();
    const installed = await completeInstall(app, dsn);
    tenantId = installed.tenantId;
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

  it("super-admin login + GET /auth/me (K5)", async () => {
    const login = await app.inject({
      method: "POST",
      url: AUTH_HTTP.login,
      payload: {
        email: "admin@example.com",
        password: "secret-pass",
      },
    });
    assert.equal(login.statusCode, 200);
    const body = login.json();
    assert.equal(body.ok, true);
    assert.ok(body.token);
    assert.equal(body.user.email, "admin@example.com");
    assert.ok(body.user.roles.includes("super_admin"));

    const cookie = sessionCookieFromResponse(login.headers);
    const me = await app.inject({
      method: "GET",
      url: AUTH_HTTP.me,
      headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
    });
    assert.equal(me.statusCode, 200);
    assert.equal(me.json().user.id, body.user.id);
  });

  it("business route requires session when installed", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/platform/ping",
    });
    assert.equal(res.statusCode, 401);
  });

  it("TC-GOLD-J0c-02 happy path: reset senha + login", async () => {
    await app.inject({
      method: "POST",
      url: AUTH_HTTP.passwordResetRequest,
      payload: { email: "admin@example.com" },
    });

    const pool = getRuntimePool();
    assert.ok(pool);
    const outbox = await pool.query<{ payload: { resetToken: string } }>(
      `SELECT payload FROM notify_outbox WHERE kind = 'password_reset' ORDER BY created_at DESC LIMIT 1`,
    );
    const resetToken = outbox.rows[0]?.payload.resetToken;
    assert.ok(resetToken);

    const confirm = await app.inject({
      method: "POST",
      url: AUTH_HTTP.passwordResetConfirm,
      payload: { token: resetToken, password: "new-secret-99" },
    });
    assert.equal(confirm.statusCode, 200);

    const login = await app.inject({
      method: "POST",
      url: AUTH_HTTP.login,
      payload: {
        email: "admin@example.com",
        password: "new-secret-99",
      },
    });
    assert.equal(login.statusCode, 200);
  });

  it("invite operator happy path", async () => {
    const login = await app.inject({
      method: "POST",
      url: AUTH_HTTP.login,
      payload: {
        email: "admin@example.com",
        password: "new-secret-99",
      },
    });
    const cookie = sessionCookieFromResponse(login.headers);

    const invite = await app.inject({
      method: "POST",
      url: AUTH_HTTP.invites,
      headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
      payload: {
        email: "operator@example.com",
        tenantId,
        role: "operator",
      },
    });
    assert.equal(invite.statusCode, 200);

    const pool = getRuntimePool();
    const outbox = await pool!.query<{ payload: { inviteToken: string } }>(
      `SELECT payload FROM notify_outbox WHERE kind = 'user_invite' ORDER BY created_at DESC LIMIT 1`,
    );
    const inviteToken = outbox.rows[0]?.payload.inviteToken;
    assert.ok(inviteToken);

    const accept = await app.inject({
      method: "POST",
      url: AUTH_HTTP.invitesAccept,
      payload: {
        token: inviteToken,
        password: "op-pass",
        displayName: "Operador",
      },
    });
    assert.equal(accept.statusCode, 200);

    const opLogin = await app.inject({
      method: "POST",
      url: AUTH_HTTP.login,
      payload: {
        email: "operator@example.com",
        password: "op-pass",
      },
    });
    assert.equal(opLogin.statusCode, 200);
    assert.ok(opLogin.json().user.roles.includes("operator"));
  });

  it("redactSecrets strips passwords from log lines", () => {
    const line = redactSecrets(
      'auth {"password":"secret-pass","email":"a@b.com"}',
    );
    assert.ok(!line.includes("secret-pass"));
    assert.ok(line.includes("********"));
  });
});
