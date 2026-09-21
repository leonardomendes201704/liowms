import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import pg from "pg";
import {
  AUTH_HTTP,
  IDEMPOTENCY_HEADER,
  SESSION_COOKIE_NAME,
  TENANT_CONTEXT_HEADER,
  TENANT_LEDGER_HTTP,
} from "@liowms/shared";
import { buildServer } from "../src/server.js";
import { getRuntimePool, setRuntimePool } from "../src/db/pool.js";
import { sumLotQuantity } from "../src/ledger/service.js";

const { Pool } = pg;

const adminDsn = process.env.LIOWMS_TEST_PG_ADMIN_DSN;
if (!adminDsn) {
  throw new Error(
    "Set LIOWMS_TEST_PG_ADMIN_DSN for integration tests (admin Postgres DSN)",
  );
}

const testDb = `liowms_wms100_${Date.now()}`;

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

describe("inventory ledger (WMS-100 / J0e-01)", () => {
  let dsn: string;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let tenantId: string;
  let plantId: string;
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

    const plant = await app.inject({
      method: "POST",
      url: `/api/v1/tenants/${tenantId}/plants`,
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${cookie}`,
        [TENANT_CONTEXT_HEADER]: tenantId,
      },
      payload: { slug: "fab1", name: "Planta 1" },
    });
    assert.equal(plant.statusCode, 201);
    plantId = (plant.json() as { plant: { id: string } }).plant.id;
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

  const authHeaders = () => ({
    cookie: `${SESSION_COOKIE_NAME}=${cookie}`,
    [TENANT_CONTEXT_HEADER]: tenantId,
  });

  it("TC-GOLD J0e-01: movement → log → balance = sum of deltas", async () => {
    const key1 = `idem-j0e-${Date.now()}-1`;
    const post1 = await app.inject({
      method: "POST",
      url: TENANT_LEDGER_HTTP.movements,
      headers: {
        ...authHeaders(),
        [IDEMPOTENCY_HEADER.toLowerCase()]: key1,
      },
      payload: {
        plantId,
        documentRef: "NF-1001",
        lotCode: "LOT-A",
        locationCode: "A-01-01",
        quantityDelta: 10,
      },
    });
    assert.equal(post1.statusCode, 201);

    const key2 = `idem-j0e-${Date.now()}-2`;
    const post2 = await app.inject({
      method: "POST",
      url: TENANT_LEDGER_HTTP.movements,
      headers: {
        ...authHeaders(),
        [IDEMPOTENCY_HEADER.toLowerCase()]: key2,
      },
      payload: {
        plantId,
        documentRef: "NF-1001",
        lotCode: "LOT-A",
        locationCode: "A-01-01",
        quantityDelta: 5,
      },
    });
    assert.equal(post2.statusCode, 201);

    const list = await app.inject({
      method: "GET",
      url: `${TENANT_LEDGER_HTTP.transactions}?lot_code=LOT-A&document_ref=NF-1001`,
      headers: authHeaders(),
    });
    assert.equal(list.statusCode, 200);
    const body = list.json() as {
      transactions: { documentRef: string; lotCode: string }[];
      total: number;
    };
    assert.equal(body.total, 2);
    assert.equal(body.transactions[0].documentRef, "NF-1001");
    assert.equal(body.transactions[0].lotCode, "LOT-A");

    const balances = await app.inject({
      method: "GET",
      url: `${TENANT_LEDGER_HTTP.balances}?lot_code=LOT-A`,
      headers: authHeaders(),
    });
    assert.equal(balances.statusCode, 200);
    const balBody = balances.json() as {
      balances: { balance: string; locationCode: string }[];
    };
    assert.equal(balBody.balances.length, 1);
    assert.equal(balBody.balances[0].locationCode, "A-01-01");
    assert.equal(balBody.balances[0].balance, "15");

    const sum = await sumLotQuantity(tenantId, "LOT-A");
    assert.equal(sum, "15");
  });

  it("idempotency: duplicate key does not double-post", async () => {
    const key = `idem-dup-${Date.now()}`;
    const payload = {
      plantId,
      documentRef: "NF-DUP",
      lotCode: "LOT-DUP",
      locationCode: "B-01",
      quantityDelta: 3,
    };
    const first = await app.inject({
      method: "POST",
      url: TENANT_LEDGER_HTTP.movements,
      headers: {
        ...authHeaders(),
        [IDEMPOTENCY_HEADER.toLowerCase()]: key,
      },
      payload,
    });
    assert.equal(first.statusCode, 201);
    const txId = (first.json() as { transaction: { id: string } }).transaction.id;

    const second = await app.inject({
      method: "POST",
      url: TENANT_LEDGER_HTTP.movements,
      headers: {
        ...authHeaders(),
        [IDEMPOTENCY_HEADER.toLowerCase()]: key,
      },
      payload: { ...payload, quantityDelta: 99 },
    });
    assert.equal(second.statusCode, 201);
    const txId2 = (second.json() as { transaction: { id: string } }).transaction.id;
    assert.equal(txId, txId2);

    const sum = await sumLotQuantity(tenantId, "LOT-DUP");
    assert.equal(sum, "3");
  });

  it("rejects movement without Idempotency-Key", async () => {
    const res = await app.inject({
      method: "POST",
      url: TENANT_LEDGER_HTTP.movements,
      headers: authHeaders(),
      payload: {
        plantId,
        documentRef: "X",
        lotCode: "L",
        locationCode: "Z",
        quantityDelta: 1,
      },
    });
    assert.equal(res.statusCode, 400);
  });

  it("transactions list rejects PATCH/DELETE (405)", async () => {
    const patch = await app.inject({
      method: "PATCH",
      url: TENANT_LEDGER_HTTP.transactions,
      headers: authHeaders(),
      payload: {},
    });
    assert.equal(patch.statusCode, 405);
    const del = await app.inject({
      method: "DELETE",
      url: TENANT_LEDGER_HTTP.transactions,
      headers: authHeaders(),
    });
    assert.equal(del.statusCode, 405);
  });

  it("DB trigger blocks UPDATE on inventory_transactions", async () => {
    const pool = getRuntimePool()!;
    const idRes = await pool.query<{ id: string }>(
      `SELECT id FROM ledger.inventory_transactions LIMIT 1`,
    );
    assert.ok(idRes.rowCount);
    await assert.rejects(
      () =>
        pool.query(
          `UPDATE ledger.inventory_transactions SET lot_code = 'hacked' WHERE id = $1`,
          [idRes.rows[0].id],
        ),
      /append-only/,
    );
  });
});
