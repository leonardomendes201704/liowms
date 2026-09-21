import { RequireRole } from "./RequireRole";

/** Tenant-scoped admin surfaces (K9–K14, K12, K13 invite) — J12-02 / S-UX. */
export function RequireTenantAdmin({ children }: { children: React.ReactNode }) {
  return <RequireRole role="tenant_admin">{children}</RequireRole>;
}
