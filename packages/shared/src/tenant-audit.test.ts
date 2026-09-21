import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TENANT_AUDIT_HTTP,
  buildTenantAuditEventsUrl,
  formatAuditJson,
  isAuditEventsList,
  tenantAuditAppPath,
} from "./tenant-audit.js";

describe("tenant-audit (WMS-98)", () => {
  it("exposes audit events API path", () => {
    assert.equal(TENANT_AUDIT_HTTP.events, "/api/v1/tenant/audit-events");
  });

  it("builds query string for actor and period filters", () => {
    const url = buildTenantAuditEventsUrl({
      actor: "user-1",
      from: "2026-09-01",
      to: "2026-09-21",
    });
    assert.ok(url.startsWith("/api/v1/tenant/audit-events?"));
    assert.match(url, /actor=user-1/);
    assert.match(url, /from=2026-09-01/);
    assert.match(url, /to=2026-09-21/);
  });

  it("maps tenant-scoped app route", () => {
    assert.equal(
      tenantAuditAppPath("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      "/app/t/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/audit",
    );
  });

  it("recognizes list response shape", () => {
    assert.equal(
      isAuditEventsList({ events: [], page: 1, limit: 25, total: 0 }),
      true,
    );
    assert.equal(isAuditEventsList({ plants: [] }), false);
  });

  it("formats JSON for diff panels", () => {
    const text = formatAuditJson({ smtp: { host: "x" } });
    assert.match(text, /"host"/);
    assert.equal(formatAuditJson(null), "—");
  });
});
