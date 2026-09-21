import type { AuthErrorBody, TenantKernelStatusResponse } from "@liowms/shared";
import { TENANT_CONTEXT_HEADER, TENANT_KERNEL_HTTP } from "@liowms/shared";

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

export async function fetchTenantKernelStatus(
  tenantId: string,
): Promise<TenantKernelStatusResponse | AuthErrorBody> {
  const res = await fetch(TENANT_KERNEL_HTTP.status, {
    credentials: "include",
    headers: tenantHeaders(tenantId),
  });
  return readJson(res);
}
