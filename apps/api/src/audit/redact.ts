import {
  KNOWN_SECRET_SETTING_KEYS,
  SECRET_MASK,
  type TenantSettingEntry,
} from "@liowms/shared";

const SECRET_KEY_SET = new Set<string>(KNOWN_SECRET_SETTING_KEYS);

export function isSecretSettingKey(key: string): boolean {
  return SECRET_KEY_SET.has(key);
}

/** ADR-004: never persist cleartext secrets in audit JSON. */
export function maskSecretValue(key: string, value: unknown): unknown {
  if (isSecretSettingKey(key)) {
    return value === null || value === undefined || value === "" ? null : SECRET_MASK;
  }
  return value;
}

export function settingsEntriesToAuditMap(
  entries: TenantSettingEntry[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const entry of entries) {
    if (entry.kind === "secret") {
      out[entry.key] = entry.set ? SECRET_MASK : null;
    } else {
      out[entry.key] = maskSecretValue(entry.key, entry.value);
    }
  }
  return out;
}
