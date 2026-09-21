import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  installCodeToK4,
  k4Title,
  type K4Variant,
  type WizardStep,
} from "@liowms/shared";
import { completeInstall, fetchHealth, testDsn } from "../api/install-client";
import {
  InstallShell,
  LioBtnPrimary,
  LioErrorPanel,
  LioField,
  LioSelect,
} from "../components/install-ui";
import styles from "../components/install-shell.module.css";

const GALLERY = "http://127.0.0.1:9200/gallery/OBJ-LIOWMS-001/design/concepts";
const MOCK_BY_STEP: Record<WizardStep | 4, string> = {
  1: `${GALLERY}/k1-wizard-dsn.png`,
  2: `${GALLERY}/k1-wizard-dsn.png`,
  3: `${GALLERY}/k2-wizard-admin.png`,
  4: `${GALLERY}/k3-wizard-success.png`,
};
const MOCK_K4 = `${GALLERY}/k4-wizard-error.png`;

const LANGUAGE_OPTIONS = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
];

const TIMEZONE_OPTIONS = [
  { value: "America/Sao_Paulo", label: "America/São Paulo (UTC−3)" },
  { value: "America/Manaus", label: "America/Manaus (UTC−4)" },
  { value: "UTC", label: "UTC" },
];

const UOM_OPTIONS = [
  { value: "metric", label: "Métrico (kg, m)" },
  { value: "imperial", label: "Imperial (lb, ft)" },
] as const;

type UomSystem = (typeof UOM_OPTIONS)[number]["value"];

interface LocaleConfig {
  language: string;
  timezone: string;
}

function defaultPublicUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/`;
  }
  return "https://";
}

export function InstallWizardPage() {
  const navigate = useNavigate();
  const [bootLoading, setBootLoading] = useState(true);
  const [step, setStep] = useState<WizardStep>(1);
  const [surface, setSurface] = useState<"steps" | "success" | "error">("steps");
  const [k4, setK4] = useState<K4Variant | null>(null);
  const [k4Message, setK4Message] = useState("");
  const [k4Log, setK4Log] = useState<string[] | undefined>();
  const [busy, setBusy] = useState(false);

  const [locale, setLocale] = useState<LocaleConfig>({
    language: "pt-BR",
    timezone: "America/Sao_Paulo",
  });
  const [dsn, setDsn] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [uomSystem, setUomSystem] = useState<UomSystem>("metric");
  const [publicUrl, setPublicUrl] = useState(defaultPublicUrl);

  const showK4 = useCallback((variant: K4Variant, message: string, log?: string[]) => {
    setK4(variant);
    setK4Message(message);
    setK4Log(log);
    setSurface("error");
  }, []);

  const clearK4 = useCallback(() => {
    setK4(null);
    setK4Message("");
    setK4Log(undefined);
    setSurface("steps");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const health = await fetchHealth();
        if (cancelled) return;
        if (health.installed || health.phase === "installed") {
          showK4(
            "already_installed",
            "O install lock está ativo. Use o login para acessar a instância.",
          );
        }
      } catch {
        if (!cancelled) {
          showK4(
            "db_refused",
            "Não foi possível verificar o estado da instalação. Confirme se a API está no ar.",
          );
        }
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showK4]);

  const stepperStep = useMemo(() => {
    if (surface === "success") return 4 as const;
    if (surface === "error") return 4 as const;
    return step;
  }, [surface, step]);

  const mockRef = surface === "error" ? MOCK_K4 : MOCK_BY_STEP[stepperStep];

  const onTestDsn = async () => {
    if (!dsn.trim()) return;
    setBusy(true);
    clearK4();
    try {
      const result = await testDsn(dsn.trim());
      if ("ok" in result && result.ok) {
        setStep(3);
      } else {
        const err = result as { code: string; message: string; logExcerpt?: string[] };
        const variant = installCodeToK4(err.code) ?? "db_refused";
        showK4(variant, err.message, err.logExcerpt);
      }
    } catch {
      showK4(
        "db_refused",
        "Falha de rede ao testar a conexão. Verifique a API e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onRunInstall = async () => {
    setBusy(true);
    clearK4();
    try {
      const result = await completeInstall({
        dsn: dsn.trim(),
        locale: locale.language,
        timezone: locale.timezone,
        instanceUrl: publicUrl.trim(),
        admin: {
          email: adminEmail.trim(),
          password: adminPassword,
          displayName: adminName.trim(),
        },
        tenant: { name: tenantName.trim(), slug: tenantSlug.trim() },
      });
      if ("ok" in result && result.ok) {
        setSurface("success");
        window.setTimeout(() => {
          navigate(result.redirect ?? "/login");
        }, 1800);
      } else {
        const err = result as { code: string; message: string; logExcerpt?: string[] };
        const variant = installCodeToK4(err.code) ?? "migration_failed";
        showK4(variant, err.message, err.logExcerpt);
      }
    } catch {
      showK4(
        "migration_failed",
        "Falha de rede durante a instalação. Nenhum install lock deve ter sido gravado.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (bootLoading) {
    return (
      <InstallShell step={1} mockRef={MOCK_BY_STEP[1]}>
        <p className={styles.loadingScreen}>Verificando estado da instância…</p>
      </InstallShell>
    );
  }

  if (surface === "error" && k4) {
    return (
      <InstallShell step={4} mockRef={mockRef}>
        <LioErrorPanel
          title={k4Title(k4)}
          message={k4Message}
          logExcerpt={k4Log}
          onRetry={
            k4 === "already_installed"
              ? undefined
              : () => {
                  clearK4();
                  setStep(k4 === "migration_failed" ? 3 : 2);
                }
          }
          secondaryAction={
            k4 === "already_installed" ? (
              <Link className={styles.linkButton} to="/login">
                Ir para login
              </Link>
            ) : undefined
          }
        />
      </InstallShell>
    );
  }

  if (surface === "success") {
    return (
      <InstallShell step={4} mockRef={MOCK_BY_STEP[4]}>
        <div className={styles.successPanel}>
          <div className={styles.successIcon} aria-hidden>
            ✓
          </div>
          <h2 className={styles.sectionTitle}>Instalação concluída</h2>
          <p className={styles.sectionLead}>
            Install lock ativo. Redirecionando para o login…
          </p>
          <Link className={styles.linkButton} to="/login">
            Continuar para login
          </Link>
        </div>
      </InstallShell>
    );
  }

  return (
    <InstallShell step={step} mockRef={mockRef}>
      {step === 1 ? (
        <>
          <h2 className={styles.sectionTitle}>Idioma e fuso horário</h2>
          <p className={styles.sectionLead}>
            Preferências iniciais da instância. Nenhum segredo é solicitado nesta etapa.
          </p>
          <div className={styles.grid2}>
            <LioSelect
              id="language"
              label="Idioma da interface"
              value={locale.language}
              onChange={(language) => setLocale((prev) => ({ ...prev, language }))}
              options={LANGUAGE_OPTIONS}
            />
            <LioSelect
              id="timezone"
              label="Fuso horário"
              value={locale.timezone}
              onChange={(timezone) => setLocale((prev) => ({ ...prev, timezone }))}
              options={TIMEZONE_OPTIONS}
            />
          </div>
          <div className={styles.actions}>
            <LioBtnPrimary onClick={() => setStep(2)}>Continuar</LioBtnPrimary>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <h2 className={styles.sectionTitle}>Conexão PostgreSQL</h2>
          <p className={styles.sectionLead}>
            Informe o DSN completo — único segredo visível no wizard (ADR-003).
          </p>
          <LioField
            id="dsn"
            label="Connection string (DSN)"
            hint="Ex.: postgres://user:senha@host:5432/liowms_staging"
            value={dsn}
            onChange={setDsn}
            masked
            autoComplete="off"
          />
          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={() => setStep(1)}>
              Voltar
            </button>
            <LioBtnPrimary loading={busy} disabled={!dsn.trim()} onClick={onTestDsn}>
              Testar conexão
            </LioBtnPrimary>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <h2 className={styles.sectionTitle}>Super-admin e tenant raiz</h2>
          <p className={styles.sectionLead}>
            Conta plataforma, tenant inicial, sistema de medidas e URL pública da instância.
          </p>
          <LioField
            id="adminName"
            label="Nome do super-admin"
            value={adminName}
            onChange={setAdminName}
          />
          <LioField
            id="adminEmail"
            label="E-mail do super-admin"
            type="email"
            value={adminEmail}
            onChange={setAdminEmail}
            autoComplete="username"
          />
          <LioField
            id="adminPassword"
            label="Senha inicial"
            type="password"
            value={adminPassword}
            onChange={setAdminPassword}
            autoComplete="new-password"
          />
          <div className={styles.grid2}>
            <LioField
              id="tenantName"
              label="Nome do tenant raiz"
              value={tenantName}
              onChange={setTenantName}
            />
            <LioField
              id="tenantSlug"
              label="Slug do tenant"
              hint="Minúsculas, hífen permitido"
              value={tenantSlug}
              onChange={setTenantSlug}
            />
          </div>
          <LioSelect
            id="uom"
            label="Sistema de unidades (UoM)"
            value={uomSystem}
            onChange={(v) => setUomSystem(v as UomSystem)}
            options={[...UOM_OPTIONS]}
          />
          <LioField
            id="publicUrl"
            label="URL pública da instância"
            value={publicUrl}
            onChange={setPublicUrl}
          />
          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={() => setStep(2)}>
              Voltar
            </button>
            <LioBtnPrimary
              loading={busy}
              disabled={
                !adminEmail.trim() ||
                !adminPassword ||
                !adminName.trim() ||
                !tenantName.trim() ||
                !tenantSlug.trim() ||
                !publicUrl.trim()
              }
              onClick={onRunInstall}
            >
              Instalar LioWMS
            </LioBtnPrimary>
          </div>
        </>
      ) : null}
    </InstallShell>
  );
}
