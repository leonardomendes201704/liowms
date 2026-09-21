import type {
  AuthErrorBody,
  PlatformTenantCreateBody,
  PlatformTenantCreateResponse,
  PlatformTenantDetailResponse,
  PlatformTenantOffboardResponse,
  PlatformTenantPatchBody,
  PlatformTenantsListResponse,
} from "@liowms/shared";
import {
  PLATFORM_HTTP,
  platformTenantDetailPath,
  platformTenantOffboardPath,
} from "@liowms/shared";

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

export async function listPlatformTenants(): Promise<
  PlatformTenantsListResponse | AuthErrorBody
> {
  const res = await fetch(PLATFORM_HTTP.tenants, { credentials: "include" });
  return readJson(res);
}

export async function createPlatformTenant(
  body: PlatformTenantCreateBody,
): Promise<PlatformTenantCreateResponse | AuthErrorBody> {
  const res = await fetch(PLATFORM_HTTP.tenants, {
    ...jsonOpts,
    method: "POST",
    body: JSON.stringify(body),
  });
  return readJson(res);
}

export async function getPlatformTenant(
  tenantId: string,
): Promise<PlatformTenantDetailResponse | AuthErrorBody> {
  const res = await fetch(platformTenantDetailPath(tenantId), {
    credentials: "include",
  });
  return readJson(res);
}

export async function patchPlatformTenantQuota(
  tenantId: string,
  body: PlatformTenantPatchBody,
): Promise<PlatformTenantDetailResponse | AuthErrorBody> {
  const res = await fetch(platformTenantDetailPath(tenantId), {
    ...jsonOpts,
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return readJson(res);
}

export async function offboardPlatformTenant(
  tenantId: string,
): Promise<PlatformTenantOffboardResponse | AuthErrorBody> {
  const res = await fetch(platformTenantOffboardPath(tenantId), {
    ...jsonOpts,
    method: "POST",
    body: "{}",
  });
  return readJson(res);
}
