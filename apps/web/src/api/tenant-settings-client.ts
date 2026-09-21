import type {
  AuthErrorBody,
  TenantSettingsGetResponse,
  TenantSettingsPatchBody,
  TenantSettingsPatchResponse,
} from "@liowms/shared";
import { TENANT_CONTEXT_HEADER, TENANT_SETTINGS_HTTP } from "@liowms/shared";

const jsonOpts: RequestInit = {
  credentials: "include",
  headers: { "Content-Type": "application/json" },
};

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

export async function getTenantSettings(
  tenantId: string,
): Promise<TenantSettingsGetResponse | AuthErrorBody> {
  const res = await fetch(TENANT_SETTINGS_HTTP.settings, {
    credentials: "include",
    headers: tenantHeaders(tenantId),
  });
  return readJson(res);
}

export async function patchTenantSettings(
  tenantId: string,
  body: TenantSettingsPatchBody,
): Promise<TenantSettingsPatchResponse | AuthErrorBody> {
  const res = await fetch(TENANT_SETTINGS_HTTP.settings, {
    ...jsonOpts,
    method: "PATCH",
    headers: tenantHeaders(tenantId),
    body: JSON.stringify(body),
  });
  return readJson(res);
}
