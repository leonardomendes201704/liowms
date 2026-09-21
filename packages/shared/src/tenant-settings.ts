/** S0.4 tenant settings API (WMS-94 / K9). */
export const TENANT_SETTINGS_HTTP = {
  settings: "/api/v1/tenant/settings",
} as const;

/** Non-secret SMTP + branding keys persisted in `config_settings`. */
export const SMTP_PLAIN_KEYS = {
  host: "smtp.host",
  port: "smtp.port",
  user: "smtp.user",
  from: "smtp.from",
} as const;

export const SMTP_SECRET_KEYS = {
  password: "smtp.password",
} as const;

export const BRANDING_PLAIN_KEYS = {
  appName: "branding.appName",
  logoUrl: "branding.logoUrl",
} as const;

export const KNOWN_SECRET_SETTING_KEYS: readonly string[] = [
  SMTP_SECRET_KEYS.password,
];

export const SECRET_MASK = "********" as const;

export type TenantSettingKind = "plain" | "secret";

export interface TenantSettingPlainEntry {
  key: string;
  kind: "plain";
  value: unknown;
}

export interface TenantSettingSecretEntry {
  key: string;
  kind: "secret";
  display: typeof SECRET_MASK;
  set: boolean;
}

export type TenantSettingEntry =
  | TenantSettingPlainEntry
  | TenantSettingSecretEntry;

export interface TenantSettingsGetResponse {
  settings: TenantSettingEntry[];
}

export interface TenantSettingsPatchBody {
  /** Plain JSON values (smtp.host, smtp.port, flags, etc.). */
  plain?: Record<string, unknown>;
  /** Secret values — never returned on GET. */
  secrets?: Record<string, string>;
}

export interface TenantSettingsPatchResponse {
  settings: TenantSettingEntry[];
}

export function indexTenantSettings(
  entries: TenantSettingEntry[],
): Map<string, TenantSettingEntry> {
  return new Map(entries.map((entry) => [entry.key, entry]));
}

export function plainStringFromSettings(
  entries: TenantSettingEntry[],
  key: string,
): string {
  const entry = indexTenantSettings(entries).get(key);
  if (!entry || entry.kind !== "plain") {
    return "";
  }
  const { value } = entry;
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return String(value);
}

export function secretIsConfigured(
  entries: TenantSettingEntry[],
  key: string,
): boolean {
  const entry = indexTenantSettings(entries).get(key);
  return entry?.kind === "secret" && entry.set;
}

export interface K9FormSnapshot {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpFrom: string;
  smtpPassword: string;
  brandingAppName: string;
  brandingLogoUrl: string;
  passwordDirty: boolean;
}

export function buildTenantSettingsPatch(
  form: K9FormSnapshot,
): TenantSettingsPatchBody {
  const plain: Record<string, unknown> = {
    [SMTP_PLAIN_KEYS.host]: form.smtpHost.trim(),
    [SMTP_PLAIN_KEYS.port]: form.smtpPort.trim()
      ? Number(form.smtpPort.trim())
      : "",
    [SMTP_PLAIN_KEYS.user]: form.smtpUser.trim(),
    [SMTP_PLAIN_KEYS.from]: form.smtpFrom.trim(),
    [BRANDING_PLAIN_KEYS.appName]: form.brandingAppName.trim(),
    [BRANDING_PLAIN_KEYS.logoUrl]: form.brandingLogoUrl.trim(),
  };

  const body: TenantSettingsPatchBody = { plain };
  if (form.passwordDirty && form.smtpPassword.trim()) {
    body.secrets = {
      [SMTP_SECRET_KEYS.password]: form.smtpPassword,
    };
  }
  return body;
}

/** PT-BR copy for K9 save success (audit-friendly, no S0.5 UI). */
export function k9SaveSuccessMessage(): string {
  return "Configurações salvas. Valores secretos permanecem cifrados no banco e não são exibidos após o envio.";
}

export function k9SettingsLead(): string {
  return "SMTP e identidade visual do tenant. Senhas de integração são armazenadas com envelope (ADR-004); o histórico de auditoria completo chega em versão futura.";
}
