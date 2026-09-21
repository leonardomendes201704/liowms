import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  k11LedgerTitle,
  tenantLedgerAppPath,
} from "@liowms/shared";
import { resolveTenantLedgerRoute } from "./pages/TenantLedgerPage";

describe("K11 transaction-log (WMS-101 smoke)", () => {
  it("route helper matches shared path", () => {
    const tid = "00000000-0000-4000-8000-000000000099";
    assert.equal(resolveTenantLedgerRoute(tid), tenantLedgerAppPath(tid));
  });

  it("copy strings present", () => {
    assert.ok(k11LedgerTitle().includes("K11"));
  });
});
