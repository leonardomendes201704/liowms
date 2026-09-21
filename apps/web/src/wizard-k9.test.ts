import { describe, expect, it } from "vitest";
import {
  BRANDING_PLAIN_KEYS,
  SMTP_PLAIN_KEYS,
  SMTP_SECRET_KEYS,
  TENANT_SETTINGS_HTTP,
  buildTenantSettingsPatch,
  plainStringFromSettings,
  secretIsConfigured,
  type TenantSettingEntry,
} from "@liowms/shared";

describe("K9 tenant settings (WMS-95)", () => {
  it("exposes tenant settings API path for WMS-94", () => {
    expect(TENANT_SETTINGS_HTTP.settings).toBe("/api/v1/tenant/settings");
  });

  it("builds PATCH without secrets when password unchanged", () => {
    const body = buildTenantSettingsPatch({
      smtpHost: "smtp.example.com",
      smtpPort: "587",
      smtpUser: "mailer",
      smtpFrom: "noreply@example.com",
      smtpPassword: "",
      brandingAppName: "Lio Demo",
      brandingLogoUrl: "https://cdn.example/logo.png",
      passwordDirty: false,
    });
    expect(body.plain?.[SMTP_PLAIN_KEYS.host]).toBe("smtp.example.com");
    expect(body.secrets).toBeUndefined();
  });

  it("includes secret map only when password field was edited", () => {
    const body = buildTenantSettingsPatch({
      smtpHost: "smtp.example.com",
      smtpPort: "587",
      smtpUser: "mailer",
      smtpFrom: "noreply@example.com",
      smtpPassword: "s3cret",
      brandingAppName: "",
      brandingLogoUrl: "",
      passwordDirty: true,
    });
    expect(body.secrets?.[SMTP_SECRET_KEYS.password]).toBe("s3cret");
    expect(body.plain?.[BRANDING_PLAIN_KEYS.appName]).toBe("");
  });

  it("reads plain and secret entries from GET shape", () => {
    const entries: TenantSettingEntry[] = [
      { key: SMTP_PLAIN_KEYS.host, kind: "plain", value: "smtp.local" },
      {
        key: SMTP_SECRET_KEYS.password,
        kind: "secret",
        display: "********",
        set: true,
      },
    ];
    expect(plainStringFromSettings(entries, SMTP_PLAIN_KEYS.host)).toBe(
      "smtp.local",
    );
    expect(secretIsConfigured(entries, SMTP_SECRET_KEYS.password)).toBe(true);
  });
});
