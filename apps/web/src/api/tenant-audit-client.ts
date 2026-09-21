import type {
  AuditEventsListQuery,
  AuditEventsListResponse,
  AuthErrorBody,
} from "@liowms/shared";
import {
  TENANT_CONTEXT_HEADER,
  buildTenantAuditEventsUrl,
} from "@liowms/shared";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error("Resposta vazia do servidor");
  }
  return JSON.parse(text) as T;
}

function tenantHeaders(tenantId: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    [TENANT_CONTEXT_HEADER]: tenantId,
  };
}

export async function listTenantAuditEvents(
  tenantId: string,
  query: AuditEventsListQuery = {},
): Promise<AuditEventsListResponse | AuthErrorBody> {
  const res = await fetch(buildTenantAuditEventsUrl(query), {
    credentials: "include",
    headers: tenantHeaders(tenantId),
  });
  return readJson(res);
}
