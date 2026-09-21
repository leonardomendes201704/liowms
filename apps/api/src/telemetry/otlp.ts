import {
  TELEMETRY_OTLP_PLAIN_KEY,
  plainStringFromSettings,
  type TenantOtlpHookStatus,
  type TenantSettingEntry,
} from "@liowms/shared";
import { safeLog } from "../logging.js";

function hostFromEndpoint(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    return new URL(withScheme).hostname || null;
  } catch {
    return null;
  }
}

export function resolveOtlpFromEnv(): string | undefined {
  const raw = process.env.LIOWMS_OTLP_ENDPOINT?.trim();
  return raw || undefined;
}

export function resolveEnvOtlpHookStatus(): TenantOtlpHookStatus {
  const envEndpoint = resolveOtlpFromEnv();
  if (!envEndpoint) {
    return { configured: false, source: "none", endpointHost: null };
  }
  return {
    configured: true,
    source: "env",
    endpointHost: hostFromEndpoint(envEndpoint),
  };
}

export function resolveTenantOtlpHook(
  settings: TenantSettingEntry[],
): TenantOtlpHookStatus {
  const envEndpoint = resolveOtlpFromEnv();
  if (envEndpoint) {
    return {
      configured: true,
      source: "env",
      endpointHost: hostFromEndpoint(envEndpoint),
    };
  }
  const tenantEndpoint = plainStringFromSettings(
    settings,
    TELEMETRY_OTLP_PLAIN_KEY,
  );
  if (tenantEndpoint) {
    return {
      configured: true,
      source: "tenant",
      endpointHost: hostFromEndpoint(tenantEndpoint),
    };
  }
  return { configured: false, source: "none", endpointHost: null };
}

/** Config-only hook — logs once at startup; no network export in S0.8. */
export function logOtlpHookConfigured(status: TenantOtlpHookStatus): void {
  if (!status.configured) {
    return;
  }
  safeLog("info", "telemetry_otlp_hook_configured", {
    source: status.source,
    endpointHost: status.endpointHost,
  });
}
