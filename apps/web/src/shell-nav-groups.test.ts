import { describe, expect, it } from "vitest";
import { shellNavItems } from "./shell-nav";
import {
  defaultShellFavoriteItems,
  shellNavGroups,
  shellNavItemsReachableViaGroups,
} from "./shell-nav-groups";

const tenantId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("S-UX concept C nav groups (PAP-262)", () => {
  it("places every shellNavItems link in a rail flyout group", () => {
    const operatorItems = shellNavItems({
      roles: ["operator"],
      tenantIds: [tenantId],
    });
    const operatorGroups = shellNavGroups(operatorItems);
    expect(shellNavItemsReachableViaGroups(operatorItems, operatorGroups)).toBe(
      true,
    );

    const adminItems = shellNavItems({
      roles: ["tenant_admin"],
      tenantIds: [tenantId],
    });
    const adminGroups = shellNavGroups(adminItems);
    expect(shellNavItemsReachableViaGroups(adminItems, adminGroups)).toBe(
      true,
    );
  });

  it("default favorites cover floor operations (receipt, putaway, picking, shipping)", () => {
    const items = shellNavItems({
      roles: ["operator"],
      tenantIds: [tenantId],
    });
    const favorites = defaultShellFavoriteItems(items);
    expect(favorites.map((f) => f.label)).toEqual([
      "Recebimento (W5)",
      "Putaway (W6)",
      "Picking (W10)",
      "Expedição (W16)",
    ]);
  });
});
