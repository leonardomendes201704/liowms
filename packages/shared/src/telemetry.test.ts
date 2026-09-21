import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertTelemetryExportSafe,
  buildTelemetryExportPayload,
  telemetryExportKeyAllowed,
} from "./telemetry.js";

describe("telemetry export (J12-03 / H-3)", () => {
  it("allows safe metric keys only", () => {
    assert.equal(telemetryExportKeyAllowed("notify.sent"), true);
    assert.equal(telemetryExportKeyAllowed("notify.dlq"), true);
    assert.equal(telemetryExportKeyAllowed("client_orders"), false);
    assert.equal(telemetryExportKeyAllowed("lot_movements"), false);
  });

  it("builds export without forbidden keys", () => {
    const payload = buildTelemetryExportPayload([
      { metricKey: "notify.sent", count: 3 },
      { metricKey: "email.bounce", count: 1 },
      { metricKey: "ledger.post", count: 2 },
    ]);
    assert.equal(payload.aggregates.length, 2);
    assert.ok(payload.aggregates.some((p) => p.metricKey === "notify.sent"));
    assert.ok(payload.aggregates.some((p) => p.metricKey === "ledger.post"));
  });

  it("rejects unsafe export keys", () => {
    assert.throws(() =>
      assertTelemetryExportSafe({
        aggregates: [{ metricKey: "client_hits", count: 1 }],
      }),
    );
    const safe = buildTelemetryExportPayload([
      { metricKey: "notify.sent", count: 1 },
    ]);
    assertTelemetryExportSafe(safe);
  });
});
