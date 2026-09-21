import {
  SMTP_PLAIN_KEYS,
  SMTP_SECRET_KEYS,
  plainStringFromSettings,
  sanitizeNotifyPayload,
  type NotifyOutboxListQuery,
  type NotifyOutboxListResponse,
  type NotifyOutboxRecord,
  type NotifyOutboxStatus,
} from "@liowms/shared";
import type { PoolClient } from "pg";
import { getTenantSettings, readTenantSecretPlaintext } from "../config/service.js";
import { withDbScope } from "../db/tenant-scope.js";
import { getRuntimePool } from "../db/pool.js";
import { safeLog } from "../logging.js";

export interface TenantSmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

const MAX_ATTEMPTS = 5;

interface DbOutboxRow {
  id: string;
  tenant_id: string | null;
  kind: string;
  payload: Record<string, unknown>;
  status: NotifyOutboxStatus;
  attempts: number;
  last_error: string | null;
  created_at: Date;
  processed_at: Date | null;
  dlq_at: Date | null;
}

function rowToRecord(row: DbOutboxRow): NotifyOutboxRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    kind: row.kind,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error,
    createdAt: row.created_at.toISOString(),
    processedAt: row.processed_at?.toISOString() ?? null,
    dlqAt: row.dlq_at?.toISOString() ?? null,
    payloadSummary: sanitizeNotifyPayload(row.payload ?? {}),
  };
}

export async function loadTenantSmtpConfig(
  tenantId: string,
): Promise<TenantSmtpConfig | null> {
  const entries = await getTenantSettings(tenantId);
  const host = plainStringFromSettings(entries, SMTP_PLAIN_KEYS.host);
  const portRaw = plainStringFromSettings(entries, SMTP_PLAIN_KEYS.port);
  const port = Number(portRaw) || 587;
  const user = plainStringFromSettings(entries, SMTP_PLAIN_KEYS.user);
  const from = plainStringFromSettings(entries, SMTP_PLAIN_KEYS.from);
  const password =
    (await readTenantSecretPlaintext(tenantId, SMTP_SECRET_KEYS.password)) ??
    "";

  if (!host || !from || !password) {
    return null;
  }
  return { host, port, user, password, from };
}

export function publicAppBaseUrl(): string {
  const raw = process.env.LIOWMS_PUBLIC_APP_URL?.trim();
  if (raw) {
    return raw.replace(/\/+$/, "");
  }
  return "http://127.0.0.1:5173";
}

export async function listNotifyOutbox(
  tenantId: string,
  query: NotifyOutboxListQuery,
): Promise<NotifyOutboxListResponse> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(query.limit ?? 50)));
  const offset = (page - 1) * limit;
  const queue = query.queue ?? "active";

  const statusFilter =
    queue === "dlq"
      ? `status = 'dlq'`
      : `status IN ('pending', 'failed')`;

  return withDbScope({ tenantId }, async (client) => {
    const countRes = await client.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM notify_outbox
       WHERE tenant_id = $1 AND ${statusFilter}`,
      [tenantId],
    );
    const total = countRes.rows[0]?.c ?? 0;
    const res = await client.query<DbOutboxRow>(
      `SELECT id, tenant_id, kind, payload, status, attempts, last_error,
              created_at, processed_at, dlq_at
       FROM notify_outbox
       WHERE tenant_id = $1 AND ${statusFilter}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset],
    );
    return {
      items: res.rows.map(rowToRecord),
      page,
      limit,
      total,
    };
  });
}

export async function retryNotifyOutboxMessage(
  tenantId: string,
  messageId: string,
): Promise<
  | { ok: true; item: NotifyOutboxRecord }
  | { ok: false; code: "NOT_FOUND" | "INVALID_STATE"; message: string }
> {
  return withDbScope({ tenantId }, async (client) => {
    const res = await client.query<DbOutboxRow>(
      `SELECT id, tenant_id, kind, payload, status, attempts, last_error,
              created_at, processed_at, dlq_at
       FROM notify_outbox
       WHERE id = $1 AND tenant_id = $2`,
      [messageId, tenantId],
    );
    const row = res.rows[0];
    if (!row) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Mensagem não encontrada",
      };
    }
    if (row.status !== "dlq" && row.status !== "failed") {
      return {
        ok: false,
        code: "INVALID_STATE",
        message: "Retry permitido apenas para falha ou DLQ",
      };
    }
    const updated = await client.query<DbOutboxRow>(
      `UPDATE notify_outbox
       SET status = 'pending',
           last_error = NULL,
           dlq_at = NULL,
           next_attempt_at = now(),
           processed_at = NULL
       WHERE id = $1
       RETURNING id, tenant_id, kind, payload, status, attempts, last_error,
                 created_at, processed_at, dlq_at`,
      [messageId],
    );
    safeLog("info", "notify_outbox_retry", {
      tenantId,
      messageId,
      kind: row.kind,
    });
    return { ok: true, item: rowToRecord(updated.rows[0]) };
  });
}

export async function enqueueNotifyOutbox(input: {
  kind: string;
  payload: Record<string, unknown>;
  tenantId: string | null;
  skipDelivery?: boolean;
}): Promise<void> {
  const pool = getRuntimePool();
  if (!pool) {
    return;
  }
  const status: NotifyOutboxStatus =
    input.skipDelivery || input.kind === "smtp_config_saved"
      ? "skipped"
      : "pending";
  await pool.query(
    `INSERT INTO notify_outbox (
       kind, payload, tenant_id, status, next_attempt_at, processed_at
     ) VALUES ($1, $2::jsonb, $3, $4, now(), $5)`,
    [
      input.kind,
      JSON.stringify(input.payload),
      input.tenantId,
      status,
      status === "skipped" ? new Date() : null,
    ],
  );
}

export async function resolveTenantIdForUser(
  client: PoolClient,
  userId: string,
): Promise<string | null> {
  const res = await client.query<{ tenant_id: string }>(
    `SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 ORDER BY tenant_id LIMIT 1`,
    [userId],
  );
  return res.rows[0]?.tenant_id ?? null;
}

export async function markOutboxSent(
  client: PoolClient,
  id: string,
): Promise<void> {
  await client.query(
    `UPDATE notify_outbox
     SET status = 'sent', processed_at = now(), last_error = NULL
     WHERE id = $1`,
    [id],
  );
}

export async function markOutboxFailure(
  client: PoolClient,
  id: string,
  attempts: number,
  errorMessage: string,
): Promise<void> {
  const safeError = errorMessage.slice(0, 500);
  if (attempts >= MAX_ATTEMPTS) {
    await client.query(
      `UPDATE notify_outbox
       SET status = 'dlq',
           attempts = $2,
           last_error = $3,
           dlq_at = now(),
           next_attempt_at = now() + interval '1 hour'
       WHERE id = $1`,
      [id, attempts, safeError],
    );
    return;
  }
  const backoffMinutes = Math.min(60, 2 ** attempts);
  await client.query(
    `UPDATE notify_outbox
     SET status = 'failed',
         attempts = $2,
         last_error = $3,
         next_attempt_at = now() + ($4 || ' minutes')::interval
     WHERE id = $1`,
    [id, attempts, safeError, String(backoffMinutes)],
  );
}

export async function claimPendingOutboxBatch(
  limit: number,
): Promise<DbOutboxRow[]> {
  const pool = getRuntimePool();
  if (!pool) {
    return [];
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query<DbOutboxRow>(
      `SELECT id, tenant_id, kind, payload, status, attempts, last_error,
              created_at, processed_at, dlq_at
       FROM notify_outbox
       WHERE status IN ('pending', 'failed')
         AND next_attempt_at <= now()
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT $1`,
      [limit],
    );
    await client.query("COMMIT");
    return res.rows;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export type { DbOutboxRow };
