/** S0.7 notify outbox API (WMS-106 / WMS-107 / K14). */
export const TENANT_NOTIFY_HTTP = {
  outbox: "/api/v1/tenant/notify-outbox",
  retry: (id: string) => `/api/v1/tenant/notify-outbox/${id}/retry`,
} as const;

export type NotifyOutboxStatus =
  | "pending"
  | "failed"
  | "sent"
  | "dlq"
  | "skipped";

export interface NotifyOutboxRecord {
  id: string;
  tenantId: string | null;
  kind: string;
  status: NotifyOutboxStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  processedAt: string | null;
  dlqAt: string | null;
  payloadSummary: Record<string, unknown>;
}

export interface NotifyOutboxListResponse {
  items: NotifyOutboxRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface NotifyOutboxListQuery {
  page?: number;
  limit?: number;
  queue?: "active" | "dlq";
}

export function tenantNotifyAppPath(tenantId: string): string {
  return `/app/t/${tenantId}/outbox`;
}

export function buildTenantNotifyOutboxUrl(
  query: NotifyOutboxListQuery = {},
): string {
  const params = new URLSearchParams();
  if (query.queue === "dlq") {
    params.set("queue", "dlq");
  } else if (query.queue === "active") {
    params.set("queue", "active");
  }
  if (query.page !== undefined && Number.isFinite(query.page)) {
    params.set("page", String(Math.floor(query.page)));
  }
  if (query.limit !== undefined && Number.isFinite(query.limit)) {
    params.set("limit", String(Math.floor(query.limit)));
  }
  const qs = params.toString();
  return qs ? `${TENANT_NOTIFY_HTTP.outbox}?${qs}` : TENANT_NOTIFY_HTTP.outbox;
}

export function isNotifyOutboxList(
  data: unknown,
): data is NotifyOutboxListResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as { items?: unknown }).items)
  );
}

const SENSITIVE_PAYLOAD_KEYS = new Set([
  "resetToken",
  "inviteToken",
  "password",
  "smtp.password",
]);

/** Safe payload for K14 panels (ADR-004 — no secrets/tokens). */
export function sanitizeNotifyPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_PAYLOAD_KEYS.has(key)) {
      out[key] = "********";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = sanitizeNotifyPayload(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function k14OutboxTitle(): string {
  return "Fila de e-mail (K14)";
}

export function k14OutboxLead(): string {
  return "Outbox transacional e DLQ. Somente leitura — reenvio seguro apenas para mensagens em falha ou DLQ (S0.7).";
}

export function k14EmptyActiveMessage(): string {
  return "Nenhuma mensagem pendente na fila.";
}

export function k14EmptyDlqMessage(): string {
  return "Nenhuma mensagem na DLQ.";
}

export function k14LoadErrorMessage(): string {
  return "Não foi possível carregar a fila de e-mail.";
}

export function k14RetrySuccessMessage(): string {
  return "Mensagem reenfileirada para nova tentativa.";
}

export function formatNotifyTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}
