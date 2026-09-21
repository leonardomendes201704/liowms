import { getRuntimePool } from "../db/pool.js";
import { safeLog } from "../logging.js";
import {
  claimPendingOutboxBatch,
  loadTenantSmtpConfig,
  markOutboxFailure,
  markOutboxSent,
  publicAppBaseUrl,
  type DbOutboxRow,
} from "./service.js";
import { createSmtpTransport, renderOutboxEmail, sendRenderedEmail } from "./mailer.js";
import { incrementTelemetryCounter } from "../telemetry/service.js";

const DEFAULT_BATCH = 10;
const DEFAULT_INTERVAL_MS = 5000;
const DEFAULT_RATE_PER_MIN = 30;

const tenantSendTimestamps = new Map<string, number[]>();

function batchSize(): number {
  const raw = Number(process.env.LIOWMS_NOTIFY_BATCH_SIZE ?? DEFAULT_BATCH);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_BATCH;
}

function rateLimitPerMinute(): number {
  const raw = Number(
    process.env.LIOWMS_NOTIFY_RATE_LIMIT_PER_MIN ?? DEFAULT_RATE_PER_MIN,
  );
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_RATE_PER_MIN;
}

function withinRateLimit(tenantId: string): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const prev = tenantSendTimestamps.get(tenantId) ?? [];
  const recent = prev.filter((t) => t >= windowStart);
  tenantSendTimestamps.set(tenantId, recent);
  return recent.length < rateLimitPerMinute();
}

function recordSend(tenantId: string): void {
  const prev = tenantSendTimestamps.get(tenantId) ?? [];
  prev.push(Date.now());
  tenantSendTimestamps.set(tenantId, prev);
}

async function deliverRow(row: DbOutboxRow): Promise<void> {
  const pool = getRuntimePool();
  if (!pool) {
    return;
  }
  const tenantId = row.tenant_id;
  if (!tenantId) {
    const client = await pool.connect();
    try {
      await markOutboxFailure(client, row.id, row.attempts + 1, "missing_tenant");
    } finally {
      client.release();
    }
    return;
  }

  if (!withinRateLimit(tenantId)) {
    safeLog("info", "notify_rate_limited", { tenantId, messageId: row.id });
    return;
  }

  const smtp = await loadTenantSmtpConfig(tenantId);
  if (!smtp) {
    const client = await pool.connect();
    try {
      await markOutboxFailure(
        client,
        row.id,
        row.attempts + 1,
        "smtp_not_configured",
      );
    } finally {
      client.release();
    }
    return;
  }

  const rendered = renderOutboxEmail({
    kind: row.kind,
    payload: row.payload,
    appBaseUrl: publicAppBaseUrl(),
  });
  if (!rendered) {
    const client = await pool.connect();
    try {
      await markOutboxFailure(
        client,
        row.id,
        row.attempts + 1,
        "unsupported_kind",
      );
    } finally {
      client.release();
    }
    return;
  }

  const to = String(row.payload.to ?? row.payload.email ?? "").trim();
  const transport = createSmtpTransport(smtp);
  try {
    await sendRenderedEmail({
      transport,
      from: smtp.from,
      to,
      rendered,
    });
    const client = await pool.connect();
    try {
      await markOutboxSent(client, row.id);
      recordSend(tenantId);
      void incrementTelemetryCounter(tenantId, "notify.sent").catch(() => {});
      safeLog("info", "notify_outbox_sent", {
        tenantId,
        messageId: row.id,
        kind: row.kind,
        to,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "send_failed";
    const client = await pool.connect();
    try {
      await markOutboxFailure(client, row.id, row.attempts + 1, message);
      void incrementTelemetryCounter(tenantId, "notify.failed").catch(() => {});
      safeLog("error", "notify_outbox_failed", {
        tenantId,
        messageId: row.id,
        kind: row.kind,
        error: message,
      });
    } finally {
      client.release();
    }
  }
}

export async function processNotifyOutboxOnce(): Promise<number> {
  const rows = await claimPendingOutboxBatch(batchSize());
  for (const row of rows) {
    await deliverRow(row);
  }
  return rows.length;
}

let workerTimer: ReturnType<typeof setInterval> | undefined;

export function startNotifyOutboxWorker(): void {
  if (process.env.LIOWMS_NOTIFY_DISABLE_WORKER === "1") {
    return;
  }
  if (workerTimer) {
    return;
  }
  const intervalMs = Number(
    process.env.LIOWMS_NOTIFY_WORKER_INTERVAL_MS ?? DEFAULT_INTERVAL_MS,
  );
  workerTimer = setInterval(() => {
    void processNotifyOutboxOnce().catch((err) => {
      safeLog("error", "notify_worker_tick_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }, intervalMs);
  workerTimer.unref?.();
  void processNotifyOutboxOnce();
}

export function stopNotifyOutboxWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = undefined;
  }
}
