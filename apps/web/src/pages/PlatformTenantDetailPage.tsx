import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { PlatformTenant } from "@liowms/shared";
import { AUTH_ERROR_FORBIDDEN } from "@liowms/shared";
import {
  getPlatformTenant,
  offboardPlatformTenant,
  patchPlatformTenantQuota,
} from "../api/platform-client";
import { LioBtnPrimary, LioField } from "../components/install-ui";
import { W16Forbidden } from "../components/w16-forbidden";
import styles from "../components/install-shell.module.css";

function isTenantDetail(
  data: unknown,
): data is { tenant: PlatformTenant } {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as { tenant?: unknown }).tenant === "object"
  );
}

export function PlatformTenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<PlatformTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaUsers, setQuotaUsers] = useState("");
  const [saving, setSaving] = useState(false);
  const [offboarding, setOffboarding] = useState(false);
  const [offboardConfirm, setOffboardConfirm] = useState(false);

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const data = await getPlatformTenant(tenantId);
      if ("code" in data) {
        if (data.code === AUTH_ERROR_FORBIDDEN) {
          setForbidden(true);
          return;
        }
        setError(data.message);
        return;
      }
      if (isTenantDetail(data)) {
        setTenant(data.tenant);
        setQuotaUsers(
          data.tenant.quotaUsers != null ? String(data.tenant.quotaUsers) : "",
        );
      }
    } catch {
      setError("Não foi possível carregar o tenant.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onSaveQuota(e: FormEvent) {
    e.preventDefault();
    if (!tenantId || tenant?.deactivatedAt) return;
    setSaving(true);
    setError(null);
    try {
      const quota = Number.parseInt(quotaUsers, 10);
      if (!Number.isFinite(quota) || quota < 1) {
        setError("Informe uma cota válida (≥ 1).");
        return;
      }
      const result = await patchPlatformTenantQuota(tenantId, { quotaUsers: quota });
      if ("code" in result) {
        setError(result.message);
        return;
      }
      if (isTenantDetail(result)) {
        setTenant(result.tenant);
      }
    } catch {
      setError("Falha ao salvar cota.");
    } finally {
      setSaving(false);
    }
  }

  async function onOffboard() {
    if (!tenantId || !offboardConfirm) return;
    setOffboarding(true);
    setError(null);
    try {
      const result = await offboardPlatformTenant(tenantId);
      if ("code" in result) {
        setError(result.message);
        return;
      }
      if ("tenant" in result) {
        setTenant(result.tenant);
        setOffboardConfirm(false);
      }
    } catch {
      setError("Falha no offboarding.");
    } finally {
      setOffboarding(false);
    }
  }

  if (forbidden) {
    return (
      <main className={styles.card}>
        <W16Forbidden reason="forbidden" />
      </main>
    );
  }

  return (
    <main className={styles.card}>
      <p className={styles.sectionLead}>
        <Link to="/app/platform/tenants" className={styles.mockLink}>
          ← Tenants (K6)
        </Link>
        <span className={styles.tenantMeta}> · Referência visual (MinIO K8/K15/K16)</span>
      </p>
      <h2 className={styles.sectionTitle}>Detalhe do tenant (K8)</h2>

      {error ? (
        <p className={styles.errorMessage} role="alert">{error}</p>
      ) : null}

      {loading || !tenant ? (
        <p>Carregando…</p>
      ) : (
        <>
          <p className={styles.sectionLead}>
            <strong>{tenant.name}</strong> · <code className={styles.inlineCode}>{tenant.slug}</code>
            {tenant.isRoot ? " · raiz" : ""}
            {tenant.deactivatedAt ? " · desativado" : ""}
          </p>

          {!tenant.isRoot && !tenant.deactivatedAt ? (
            <form className={styles.formStack} onSubmit={onSaveQuota}>
              <LioField
                id="quotaUsersEdit"
                label="Cota de usuários"
                type="number"
                value={quotaUsers}
                onChange={setQuotaUsers}
              />
              <div className={styles.actions}>
                <LioBtnPrimary type="submit" loading={saving}>
                  Salvar cota
                </LioBtnPrimary>
              </div>
            </form>
          ) : (
            <p className={styles.tenantMeta}>
              Cota: {tenant.quotaUsers ?? "—"} usuários
            </p>
          )}

          <p className={styles.sectionLead}>
            <Link to={`/app/t/${tenant.id}/plants`} className={styles.mockLink}>
              Plantas do tenant (K7)
            </Link>
          </p>

          {!tenant.isRoot && !tenant.deactivatedAt ? (
            <section className={styles.formStack}>
              <h3 className={styles.sectionTitle}>Offboarding (K15/K16)</h3>
              <p className={styles.sectionLead}>
                Desativa o tenant, revoga sessões dos membros e registra auditoria (ADR-004).
              </p>
              <label className={styles.sectionLead}>
                <input
                  type="checkbox"
                  checked={offboardConfirm}
                  onChange={(e) => setOffboardConfirm(e.target.checked)}
                />
                Confirmo offboarding irreversível deste tenant
              </label>
              <div className={styles.actions}>
                <LioBtnPrimary
                  type="button"
                  loading={offboarding}
                  disabled={!offboardConfirm}
                  onClick={() => void onOffboard()}
                >
                  Executar offboarding
                </LioBtnPrimary>
              </div>
            </section>
          ) : tenant.deactivatedAt ? (
            <p className={styles.tenantMeta} role="status">
              Offboarded em {tenant.deactivatedAt}
            </p>
          ) : null}
        </>
      )}
    </main>
  );
}
