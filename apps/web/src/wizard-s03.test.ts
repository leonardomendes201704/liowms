import { describe, expect, it } from "vitest";
import {
  userCanAccessTenant,
  w16Message,
  w16Title,
  PLATFORM_HTTP,
  tenantPlantsPath,
} from "@liowms/shared";

describe("S0.3 tenant admin contracts", () => {
  it("exposes platform and tenant plant API paths for WMS-91", () => {
    expect(PLATFORM_HTTP.tenants).toBe("/api/v1/platform/tenants");
    expect(tenantPlantsPath("abc")).toBe("/api/v1/tenants/abc/plants");
  });

  it("maps W16 copy for J12-02", () => {
    expect(w16Title("cross_tenant")).toMatch(/permitido/i);
    expect(w16Message("cross_tenant")).toMatch(/organização/i);
  });

  it("denies cross-tenant route access for tenant_admin", () => {
    expect(
      userCanAccessTenant(
        {
          roles: ["tenant_admin"],
          tenantIds: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
        },
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      ),
    ).toBe(false);
  });
});
