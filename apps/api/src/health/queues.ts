import { getRuntimePool } from "../db/pool.js";

export interface GlobalOutboxQueueHealth {
  workerEnabled: boolean;
  pending: number;
  dlq: number;
  ready: boolean;
  detail: string;
}

const DLQ_DEGRADED_THRESHOLD = 5;
const PENDING_DEGRADED_THRESHOLD = 25;

export function notifyWorkerEnabled(): boolean {
  return process.env.LIOWMS_NOTIFY_DISABLE_WORKER !== "1";
}

export async function resolveGlobalOutboxQueueHealth(
  installed: boolean,
): Promise<GlobalOutboxQueueHealth> {
  const workerEnabled = notifyWorkerEnabled();
  if (!installed) {
    return {
      workerEnabled,
      pending: 0,
      dlq: 0,
      ready: false,
      detail: "n/a",
    };
  }

  const pool = getRuntimePool();
  if (!pool) {
    return {
      workerEnabled,
      pending: 0,
      dlq: 0,
      ready: false,
      detail: "outbox:no_pool",
    };
  }

  const pendingRes = await pool.query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM notify_outbox
     WHERE status IN ('pending', 'failed')`,
  );
  const dlqRes = await pool.query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM notify_outbox WHERE status = 'dlq'`,
  );
  const pending = pendingRes.rows[0]?.c ?? 0;
  const dlq = dlqRes.rows[0]?.c ?? 0;
  const backlogOk =
    dlq < DLQ_DEGRADED_THRESHOLD && pending < PENDING_DEGRADED_THRESHOLD;
  const ready = workerEnabled && backlogOk;
  const detail = `outbox:worker=${workerEnabled ? "on" : "off"};pending=${pending};dlq=${dlq}`;

  return { workerEnabled, pending, dlq, ready, detail };
}
