import type { AuthUserProfile } from "@liowms/shared";
import { hasBootstrapRole } from "@liowms/shared";

export function isTenantOperatorShell(user: Pick<AuthUserProfile, "roles">): boolean {
  return (
    hasBootstrapRole(user, "operator") && !hasBootstrapRole(user, "tenant_admin")
  );
}

export function shellBrandTitle(user: Pick<AuthUserProfile, "roles">): string {
  return isTenantOperatorShell(user) ? "Operação" : "Administração";
}

export type ShellNavItem = { to: string; label: string };

/** K13 shell links for authenticated tenant members (S-UX W1). */
export function shellNavItems(
  user: Pick<AuthUserProfile, "roles" | "tenantIds">,
): ShellNavItem[] {
  const tenantId = user.tenantIds[0];
  if (!tenantId) {
    return [];
  }

  const plants: ShellNavItem = {
    to: `/app/t/${tenantId}/plants`,
    label: "Minhas plantas",
  };
  const ledger: ShellNavItem = {
    to: `/app/t/${tenantId}/ledger`,
    label: "Estoque (K11)",
  };

  if (!hasBootstrapRole(user, "tenant_admin")) {
    return [plants, ledger];
  }

  return [
    plants,
    { to: `/app/t/${tenantId}/outbox`, label: "E-mail (K14)" },
    { to: `/app/t/${tenantId}/kernel`, label: "Telemetria (K12)" },
    { to: `/app/t/${tenantId}/settings`, label: "Configurações (K9)" },
    { to: `/app/t/${tenantId}/audit`, label: "Auditoria (K10)" },
    ledger,
  ];
}
