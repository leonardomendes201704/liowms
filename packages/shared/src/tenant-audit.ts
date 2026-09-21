/** S0.5 tenant audit log API (WMS-97 / K10). */
export const TENANT_AUDIT_HTTP = {
  events: "/api/v1/tenant/audit-events",
} as const;

export interface AuditEventRecord {
  id: string;
  tenantId: string;
  occurredAt: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityKey: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
}

export interface AuditEventsListResponse {
  events: AuditEventRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface AuditEventsListQuery {
  page?: number;
  limit?: number;
  actor?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

export function tenantAuditAppPath(tenantId: string): string {
  return `/app/t/${tenantId}/audit`;
}

export function buildTenantAuditEventsUrl(
  query: AuditEventsListQuery = {},
): string {
  const params = new URLSearchParams();
  const actor = query.actor?.trim();
  if (actor) {
    params.set("actor", actor);
  }
  const entityType = query.entityType?.trim();
  if (entityType) {
    params.set("entity_type", entityType);
  }
  if (query.from?.trim()) {
    params.set("from", query.from.trim());
  }
  if (query.to?.trim()) {
    params.set("to", query.to.trim());
  }
  if (query.page !== undefined && Number.isFinite(query.page)) {
    params.set("page", String(Math.floor(query.page)));
  }
  if (query.limit !== undefined && Number.isFinite(query.limit)) {
    params.set("limit", String(Math.floor(query.limit)));
  }
  const qs = params.toString();
  return qs ? `${TENANT_AUDIT_HTTP.events}?${qs}` : TENANT_AUDIT_HTTP.events;
}

export function isAuditEventsList(data: unknown): data is AuditEventsListResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as { events?: unknown }).events)
  );
}

/** Alias used by K10 UI (WMS-98). */
export type TenantAuditEvent = AuditEventRecord;

export const isTenantAuditEventsList = isAuditEventsList;

/** Pretty JSON for read-only diff panels (K10). */
export function formatAuditJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "—";
    }
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function formatAuditOccurredAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

export function k10AuditTitle(): string {
  return "Registro de auditoria (K10)";
}

export function k10AuditLead(): string {
  return "Histórico append-only de alterações de configuração e ações admin. Somente leitura — eventos não podem ser editados ou excluídos (H-2).";
}

export function k10EmptyMessage(): string {
  return "Nenhum evento de auditoria neste período.";
}

export function k10LoadErrorMessage(): string {
  return "Não foi possível carregar o registro de auditoria.";
}
