import type {
  AuthErrorBody,
  NotifyOutboxListQuery,
  NotifyOutboxListResponse,
  NotifyOutboxRecord,
} from "@liowms/shared";
import {
  TENANT_CONTEXT_HEADER,
  TENANT_NOTIFY_HTTP,
  buildTenantNotifyOutboxUrl,
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

export async function listTenantNotifyOutbox(
  tenantId: string,
  query: NotifyOutboxListQuery = {},
): Promise<NotifyOutboxListResponse | AuthErrorBody> {
  const res = await fetch(buildTenantNotifyOutboxUrl(query), {
    credentials: "include",
    headers: tenantHeaders(tenantId),
  });
  return readJson(res);
}

export async function retryTenantNotifyOutbox(
  tenantId: string,
  messageId: string,
): Promise<{ item: NotifyOutboxRecord } | AuthErrorBody> {
  const res = await fetch(TENANT_NOTIFY_HTTP.retry(messageId), {
    method: "POST",
    credentials: "include",
    headers: tenantHeaders(tenantId),
  });
  return readJson(res);
}
