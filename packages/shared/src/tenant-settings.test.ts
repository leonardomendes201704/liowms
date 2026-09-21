import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  KNOWN_SECRET_SETTING_KEYS,
  SECRET_MASK,
  SMTP_PLAIN_KEYS,
  SMTP_SECRET_KEYS,
  buildTenantSettingsPatch,
} from "./tenant-settings.js";

describe("tenant-settings (WMS-94)", () => {
  it("masks secrets with fixed display token", () => {
    assert.equal(SECRET_MASK, "********");
    assert.ok(KNOWN_SECRET_SETTING_KEYS.includes(SMTP_SECRET_KEYS.password));
  });

  it("serializes plain SMTP keys for PATCH", () => {
    const body = buildTenantSettingsPatch({
      smtpHost: "h",
      smtpPort: "25",
      smtpUser: "u",
      smtpFrom: "f@x.com",
      smtpPassword: "",
      brandingAppName: "App",
      brandingLogoUrl: "",
      passwordDirty: false,
    });
    assert.equal(body.plain?.[SMTP_PLAIN_KEYS.port], 25);
    assert.equal(body.secrets, undefined);
  });
});
