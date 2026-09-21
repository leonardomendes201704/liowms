import type { AuthUserProfile, BootstrapRole } from "./auth.js";

/** Active tenant context header when not encoded in the URL (WMS-91). */
export const TENANT_CONTEXT_HEADER = "x-lio-tenant-id" as const;

/** REST paths for S0.3 platform + tenant admin (WMS-91 / WMS-92). */
export const PLATFORM_HTTP = {
  ping: "/api/v1/platform/ping",
  tenants: "/api/v1/platform/tenants",
} as const;

export function platformTenantDetailPath(tenantId: string): string {
  return `/api/v1/platform/tenants/${tenantId}`;
}

export function platformTenantOffboardPath(tenantId: string): string {
  return `/api/v1/platform/tenants/${tenantId}/offboard`;
}

export function tenantPlantsPath(tenantId: string): string {
  return `/api/v1/tenants/${tenantId}/plants`;
}

export function tenantDetailPath(tenantId: string): string {
  return `/api/v1/tenants/${tenantId}`;
}

export interface PlatformTenant {
  id: string;
  slug: string;
  name: string;
  isRoot: boolean;
  quotaUsers?: number | null;
  deactivatedAt?: string | null;
  createdAt?: string;
}

export interface TenantPlant {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  createdAt?: string;
}

export interface PlatformTenantsListResponse {
  tenants: PlatformTenant[];
}

export interface PlatformTenantCreateBody {
  slug: string;
  name: string;
  quotaUsers?: number;
}

export interface PlatformTenantCreateResponse {
  tenant: PlatformTenant;
}

export interface PlatformTenantDetailResponse {
  tenant: PlatformTenant;
}

export interface PlatformTenantPatchBody {
  quotaUsers: number;
}

export interface PlatformTenantOffboardResponse {
  tenant: PlatformTenant;
  sessionsRevoked: number;
}

export interface TenantPlantsListResponse {
  plants: TenantPlant[];
}

export interface TenantPlantCreateBody {
  slug: string;
  name: string;
}

export interface TenantPlantCreateResponse {
  plant: TenantPlant;
}

export function hasBootstrapRole(
  user: Pick<AuthUserProfile, "roles">,
  role: BootstrapRole,
): boolean {
  return user.roles.includes(role);
}

/** UI / route guard: super-admin may open any tenant; others only memberships. */
export function userCanAccessTenant(
  user: Pick<AuthUserProfile, "roles" | "tenantIds">,
  tenantId: string,
): boolean {
  if (hasBootstrapRole(user, "super_admin")) {
    return true;
  }
  return user.tenantIds.includes(tenantId);
}

/** W16 — cross-tenant forbidden surface (J12-02). */
export type W16Reason = "cross_tenant" | "forbidden";

export function w16Title(reason: W16Reason = "cross_tenant"): string {
  switch (reason) {
    case "cross_tenant":
      return "Acesso não permitido a este tenant";
    case "forbidden":
      return "Operação não permitida";
  }
}

export function w16Message(reason: W16Reason = "cross_tenant"): string {
  switch (reason) {
    case "cross_tenant":
      return "Este recurso pertence a outro tenant. Volte à área da sua organização.";
    case "forbidden":
      return "Você não tem permissão para ver este conteúdo.";
  }
}
