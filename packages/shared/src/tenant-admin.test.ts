import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  userCanAccessTenant,
  w16Message,
  w16Title,
} from "./tenant-admin.js";

describe("tenant access (W16)", () => {
  it("allows super_admin any tenant", () => {
    assert.equal(
      userCanAccessTenant(
        { roles: ["super_admin"], tenantIds: [] },
        "00000000-0000-4000-8000-000000000099",
      ),
      true,
    );
  });

  it("denies operator on foreign tenant", () => {
    assert.equal(
      userCanAccessTenant(
        {
          roles: ["tenant_admin"],
          tenantIds: ["00000000-0000-4000-8000-000000000001"],
        },
        "00000000-0000-4000-8000-000000000002",
      ),
      false,
    );
  });

  it("provides PT-BR W16 copy", () => {
    assert.match(w16Title("cross_tenant"), /tenant/i);
    assert.match(w16Message("cross_tenant"), /organização/i);
  });
});
