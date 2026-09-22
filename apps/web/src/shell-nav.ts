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
  const inventory: ShellNavItem = {
    to: `/app/t/${tenantId}/inventory`,
    label: "Inventário (W14)",
  };
  const receipt: ShellNavItem = {
    to: `/app/t/${tenantId}/receipt`,
    label: "Recebimento (W5)",
  };
  const putaway: ShellNavItem = {
    to: `/app/t/${tenantId}/putaway`,
    label: "Putaway (W6)",
  };
  const hold: ShellNavItem = {
    to: `/app/t/${tenantId}/hold`,
    label: "Hold (W8)",
  };
  const production: ShellNavItem = {
    to: `/app/t/${tenantId}/production`,
    label: "Produção liofilização (W11)",
  };
  const picking: ShellNavItem = {
    to: `/app/t/${tenantId}/picking`,
    label: "Picking (W10)",
  };
  const shipping: ShellNavItem = {
    to: `/app/t/${tenantId}/shipping`,
    label: "Expedição (W16)",
  };
  const genealogy: ShellNavItem = {
    to: `/app/t/${tenantId}/genealogy`,
    label: "Genealogia (W12)",
  };

  if (!hasBootstrapRole(user, "tenant_admin")) {
    return [
      plants,
      receipt,
      putaway,
      hold,
      production,
      picking,
      shipping,
      genealogy,
      inventory,
      ledger,
    ];
  }

  return [
    plants,
    receipt,
    putaway,
    hold,
    production,
    picking,
    shipping,
    genealogy,
    { to: `/app/t/${tenantId}/masters`, label: "Mestres (W7)" },
    { to: `/app/t/${tenantId}/rules`, label: "Regras (W9)" },
    { to: `/app/t/${tenantId}/topology`, label: "Topologia (W13)" },
    { to: `/app/t/${tenantId}/map`, label: "Mapa 2D (W2)" },
    { to: `/app/t/${tenantId}/rules`, label: "Regras (W9)" },
    inventory,
    { to: `/app/t/${tenantId}/integrations`, label: "Integrações (W15)" },
    { to: `/app/t/${tenantId}/outbox`, label: "E-mail (K14)" },
    { to: `/app/t/${tenantId}/kernel`, label: "Telemetria (K12)" },
    { to: `/app/t/${tenantId}/settings`, label: "Configurações (K9)" },
    { to: `/app/t/${tenantId}/audit`, label: "Auditoria (K10)" },
    ledger,
  ];
}
