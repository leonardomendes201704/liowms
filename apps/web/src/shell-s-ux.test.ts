import { describe, expect, it } from "vitest";
import { shellBrandTitle, shellNavItems } from "./shell-nav";

const tenantId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("S-UX shell K13 (J12-02)", () => {
  it("operator shell shows Operação and plants + ledger only", () => {
    const user = {
      roles: ["operator"],
      tenantIds: [tenantId],
    };
    expect(shellBrandTitle(user)).toBe("Operação");
    const labels = shellNavItems(user).map((i) => i.label);
    expect(labels).toEqual(["Minhas plantas", "Estoque (K11)"]);
  });

  it("tenant_admin keeps admin nav entries", () => {
    const user = {
      roles: ["tenant_admin"],
      tenantIds: [tenantId],
    };
    expect(shellBrandTitle(user)).toBe("Administração");
    const labels = shellNavItems(user).map((i) => i.label);
    expect(labels).toContain("Configurações (K9)");
    expect(labels).toContain("Auditoria (K10)");
    expect(labels).toContain("E-mail (K14)");
  });
});
