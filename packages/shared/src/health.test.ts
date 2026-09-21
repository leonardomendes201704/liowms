import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildHealthResponse, HEALTH_CONTRACT } from "./health.js";

describe("H-4 health contract", () => {
  it("builds uninstalled payload", () => {
    const body = buildHealthResponse({
      installed: false,
      phase: "uninstalled",
      version: "0.1.0",
      migrationsApplied: null,
      migrationsLatest: "001_install_kernel",
      queuesReady: false,
      queuesDetail: "n/a",
    });
    assert.equal(body.contract, HEALTH_CONTRACT);
    assert.equal(body.installed, false);
    assert.equal(body.status, "uninstalled");
  });
});
