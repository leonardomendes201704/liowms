import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTenantNotifyOutboxUrl,
  sanitizeNotifyPayload,
  TENANT_NOTIFY_HTTP,
} from "./tenant-notify.js";

describe("tenant-notify (K14 shared)", () => {
  it("builds outbox list URL with queue filter", () => {
    assert.equal(
      buildTenantNotifyOutboxUrl({ queue: "dlq", page: 2, limit: 25 }),
      `${TENANT_NOTIFY_HTTP.outbox}?queue=dlq&page=2&limit=25`,
    );
  });

  it("sanitizes tokens from payload summary", () => {
    const safe = sanitizeNotifyPayload({
      to: "user@example.com",
      resetToken: "secret-token",
      inviteToken: "invite-secret",
    });
    assert.equal(safe.to, "user@example.com");
    assert.equal(safe.resetToken, "********");
    assert.equal(safe.inviteToken, "********");
  });
});
