import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AUTH_ERROR_FORBIDDEN,
  BRANDING_PLAIN_KEYS,
  SMTP_PLAIN_KEYS,
  SMTP_SECRET_KEYS,
  SECRET_MASK,
  k9SaveSuccessMessage,
  k9SettingsLead,
  plainStringFromSettings,
  secretIsConfigured,
  buildTenantSettingsPatch,
  type TenantSettingEntry,
} from "@liowms/shared";
import {
  getTenantSettings,
  patchTenantSettings,
} from "../api/tenant-settings-client";
import { LioBtnPrimary, LioField } from "../components/install-ui";
import { W16Forbidden } from "../components/w16-forbidden";
import styles from "../components/install-shell.module.css";

function isSettingsList(
  data: unknown,
): data is { settings: TenantSettingEntry[] } {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as { settings?: unknown }).settings)
  );
}

function applyEntriesToForm(entries: TenantSettingEntry[]) {
  return {
    smtpHost: plainStringFromSettings(entries, SMTP_PLAIN_KEYS.host),
    smtpPort: plainStringFromSettings(entries, SMTP_PLAIN_KEYS.port),
    smtpUser: plainStringFromSettings(entries, SMTP_PLAIN_KEYS.user),
    smtpFrom: plainStringFromSettings(entries, SMTP_PLAIN_KEYS.from),
    brandingAppName: plainStringFromSettings(
      entries,
      BRANDING_PLAIN_KEYS.appName,
    ),
    brandingLogoUrl: plainStringFromSettings(
      entries,
      BRANDING_PLAIN_KEYS.logoUrl,
    ),
    passwordConfigured: secretIsConfigured(entries, SMTP_SECRET_KEYS.password),
  };
}

export function TenantSettingsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [passwordDirty, setPasswordDirty] = useState(false);
  const [passwordConfigured, setPasswordConfigured] = useState(false);

  const [brandingAppName, setBrandingAppName] = useState("");
  const [brandingLogoUrl, setBrandingLogoUrl] = useState("");

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    setSuccess(null);
    try {
      const data = await getTenantSettings(tenantId);
      if ("code" in data) {
        if (data.code === AUTH_ERROR_FORBIDDEN) {
          setForbidden(true);
          return;
        }
        setError(data.message);
        return;
      }
      if (isSettingsList(data)) {
        const next = applyEntriesToForm(data.settings);
        setSmtpHost(next.smtpHost);
        setSmtpPort(next.smtpPort);
        setSmtpUser(next.smtpUser);
        setSmtpFrom(next.smtpFrom);
        setBrandingAppName(next.brandingAppName);
        setBrandingLogoUrl(next.brandingLogoUrl);
        setPasswordConfigured(next.passwordConfigured);
        setSmtpPassword("");
        setPasswordDirty(false);
      }
    } catch {
      setError("Não foi possível carregar as configurações.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body = buildTenantSettingsPatch({
        smtpHost,
        smtpPort,
        smtpUser,
        smtpFrom,
        smtpPassword,
        brandingAppName,
        brandingLogoUrl,
        passwordDirty,
      });
      const result = await patchTenantSettings(tenantId, body);
      if ("code" in result) {
        if (result.code === AUTH_ERROR_FORBIDDEN) {
          setForbidden(true);
          return;
        }
        setError(result.message);
        return;
      }
      if (isSettingsList(result)) {
        const next = applyEntriesToForm(result.settings);
        setPasswordConfigured(next.passwordConfigured);
        setSmtpPassword("");
        setPasswordDirty(false);
        setSuccess(k9SaveSuccessMessage());
      }
    } catch {
      setError("Não foi possível salvar as configurações.");
    } finally {
      setSaving(false);
    }
  }

  const passwordHint = passwordConfigured
    ? `Senha SMTP já configurada (${SECRET_MASK}). Digite apenas para substituir.`
    : "Senha SMTP — armazenada cifrada; não será exibida após salvar.";

  if (forbidden) {
    return (
      <main className={styles.card}>
        <W16Forbidden reason="forbidden" />
      </main>
    );
  }

  return (
    <main className={styles.card}>
      <h2 className={styles.sectionTitle}>Configurações do tenant (K9)</h2>
      <p className={styles.sectionLead}>
        Tenant <code className={styles.inlineCode}>{tenantId}</code> ·{" "}
        <Link to={`/app/t/${tenantId}/plants`} className={styles.mockLink}>
          Plantas (K7)
        </Link>
      </p>
      <p className={styles.fieldHint}>{k9SettingsLead()}</p>

      {error ? (
        <p className={styles.errorMessage} role="alert">{error}</p>
      ) : null}
      {success ? (
        <p className={styles.successMessage} role="status">{success}</p>
      ) : null}

      {loading ? (
        <p>Carregando configurações…</p>
      ) : (
        <form className={styles.formStack} onSubmit={onSubmit}>
          <h3 className={styles.sectionTitle}>E-mail transacional (SMTP)</h3>
          <LioField
            id="smtpHost"
            label="Servidor SMTP"
            value={smtpHost}
            onChange={setSmtpHost}
            autoComplete="off"
          />
          <LioField
            id="smtpPort"
            label="Porta"
            value={smtpPort}
            onChange={setSmtpPort}
            autoComplete="off"
          />
          <LioField
            id="smtpUser"
            label="Usuário SMTP"
            value={smtpUser}
            onChange={setSmtpUser}
            autoComplete="off"
          />
          <LioField
            id="smtpFrom"
            label="Remetente (From)"
            value={smtpFrom}
            onChange={setSmtpFrom}
            autoComplete="off"
          />
          <LioField
            id="smtpPassword"
            label="Senha SMTP"
            type="password"
            hint={passwordHint}
            value={smtpPassword}
            masked
            onChange={(value) => {
              setSmtpPassword(value);
              setPasswordDirty(true);
            }}
            autoComplete="new-password"
          />

          <h3 className={styles.sectionTitle}>Identidade (não secreto)</h3>
          <LioField
            id="brandingAppName"
            label="Nome exibido no app"
            value={brandingAppName}
            onChange={setBrandingAppName}
          />
          <LioField
            id="brandingLogoUrl"
            label="URL do logotipo"
            hint="URL pública HTTPS; não armazena credenciais."
            value={brandingLogoUrl}
            onChange={setBrandingLogoUrl}
          />

          <div className={styles.actions}>
            <LioBtnPrimary type="submit" loading={saving}>
              Salvar configurações
            </LioBtnPrimary>
            <button
              type="button"
              className={styles.btnGhost}
              disabled={loading || saving}
              onClick={() => void reload()}
            >
              Recarregar
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
