import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import pg from "pg";
import {
  AUTH_HTTP,
  SESSION_COOKIE_NAME,
  SMTP_PLAIN_KEYS,
  SMTP_SECRET_KEYS,
  TENANT_CONTEXT_HEADER,
  TENANT_SETTINGS_HTTP,
} from "@liowms/shared";
import { buildServer } from "../src/server.js";
import { getRuntimePool, setRuntimePool } from "../src/db/pool.js";
import { readTenantSecretPlaintext } from "../src/config/service.js";
import { redactSecrets } from "../src/logging.js";

const { Pool } = pg;

const adminDsn = process.env.LIOWMS_TEST_PG_ADMIN_DSN;
if (!adminDsn) {
  throw new Error(
    "Set LIOWMS_TEST_PG_ADMIN_DSN for integration tests (admin Postgres DSN)",
  );
}

const testDb = `liowms_wms94_${Date.now()}`;
const SMTP_PASSWORD = "smtp-super-secret-94";

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

function assertNoCleartextSecret(payload: string, secret: string): void {
  assert.ok(!payload.includes(secret), "response must not echo secret");
}

describe("config store (WMS-94 / J0c-01 smoke)", () => {
  let dsn: string;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let tenantId: string;
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

  it("TC-GOLD H-01 hook: settings export JSON never contains SMTP password", async () => {
    const patch = await app.inject({
      method: "PATCH",
      url: TENANT_SETTINGS_HTTP.settings,
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${cookie}`,
        [TENANT_CONTEXT_HEADER]: tenantId,
      },
      payload: {
        plain: {
          [SMTP_PLAIN_KEYS.host]: "smtp.example.com",
          [SMTP_PLAIN_KEYS.port]: 587,
          [SMTP_PLAIN_KEYS.user]: "mailer",
        },
        secrets: {
          [SMTP_SECRET_KEYS.password]: SMTP_PASSWORD,
        },
      },
    });
    assert.equal(patch.statusCode, 200);
    const patchBody = patch.payload as string;
    assertNoCleartextSecret(patchBody, SMTP_PASSWORD);

    const get = await app.inject({
      method: "GET",
      url: TENANT_SETTINGS_HTTP.settings,
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${cookie}`,
        [TENANT_CONTEXT_HEADER]: tenantId,
      },
    });
    assert.equal(get.statusCode, 200);
    const getBody = get.payload as string;
    assertNoCleartextSecret(getBody, SMTP_PASSWORD);

    const parsed = get.json() as { settings: { key: string; kind: string }[] };
    const pwd = parsed.settings.find((s) => s.key === SMTP_SECRET_KEYS.password);
    assert.ok(pwd);
    assert.equal(pwd.kind, "secret");

    const pool = getRuntimePool()!;
    const row = await pool.query<{ ciphertext: Buffer }>(
      `SELECT ciphertext FROM config_secrets
       WHERE tenant_id = $1 AND key = $2`,
      [tenantId, SMTP_SECRET_KEYS.password],
    );
    assert.equal(row.rowCount, 1);
    const cipherHex = row.rows[0].ciphertext.toString("hex");
    assert.ok(!cipherHex.includes(Buffer.from(SMTP_PASSWORD).toString("hex")));

    const opened = await readTenantSecretPlaintext(
      tenantId,
      SMTP_SECRET_KEYS.password,
    );
    assert.equal(opened, SMTP_PASSWORD);

    const outbox = await pool.query<{ kind: string }>(
      `SELECT kind FROM notify_outbox WHERE kind = 'smtp_config_saved' LIMIT 1`,
    );
    assert.equal(outbox.rowCount, 1);

    const redacted = redactSecrets(
      JSON.stringify({ "smtp.password": SMTP_PASSWORD }),
    );
    assert.ok(!redacted.includes(SMTP_PASSWORD));
  });
});
