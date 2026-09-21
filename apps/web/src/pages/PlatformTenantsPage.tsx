import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PlatformTenant } from "@liowms/shared";
import { AUTH_ERROR_FORBIDDEN } from "@liowms/shared";
import { createPlatformTenant, listPlatformTenants } from "../api/platform-client";
import { LioBtnPrimary, LioField } from "../components/install-ui";
import { W16Forbidden } from "../components/w16-forbidden";
import styles from "../components/install-shell.module.css";

function isTenantList(
  data: unknown,
): data is { tenants: PlatformTenant[] } {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as { tenants?: unknown }).tenants)
  );
}

export function PlatformTenantsPage() {
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [quotaUsers, setQuotaUsers] = useState("10");
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const data = await listPlatformTenants();
      if ("code" in data) {
        if (data.code === AUTH_ERROR_FORBIDDEN) {
          setForbidden(true);
          return;
        }
        setError(data.message);
        return;
      }
      if (isTenantList(data)) {
        setTenants(data.tenants);
      }
    } catch {
      setError("Não foi possível carregar tenants.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const quota = Number.parseInt(quotaUsers, 10);
      const result = await createPlatformTenant({
        slug: slug.trim(),
        name: name.trim(),
        quotaUsers: Number.isFinite(quota) ? quota : undefined,
      });
      if ("code" in result) {
        setError(result.message);
        return;
      }
      if ("tenant" in result) {
        setSlug("");
        setName("");
        await reload();
      }
    } catch {
      setError("Falha ao criar tenant.");
    } finally {
      setCreating(false);
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
      <h2 className={styles.sectionTitle}>Tenants da plataforma (K6)</h2>
      <p className={styles.sectionLead}>
        Super-admin: cotas persistidas, detalhe tenant (K8) e offboarding (K15/K16).
      </p>

      {error ? (
        <p className={styles.errorMessage} role="alert">{error}</p>
      ) : null}

      {loading ? (
        <p>Carregando tenants…</p>
      ) : (
        <ul className={styles.tenantList}>
          {tenants.map((t) => (
            <li key={t.id} className={styles.tenantListItem}>
              <div>
                <strong>{t.name}</strong>
                <span className={styles.tenantMeta}>
                  {t.slug}
                  {t.isRoot ? " · raiz" : ""}
                  {t.quotaUsers != null ? ` · cota ${t.quotaUsers} usuários` : ""}
                  {t.deactivatedAt ? " · desativado" : ""}
                </span>
              </div>
              <Link to={`/app/platform/tenants/${t.id}`} className={styles.mockLink}>
                Detalhe (K8)
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form className={styles.formStack} onSubmit={onCreate}>
        <h3 className={styles.sectionTitle}>Novo tenant</h3>
        <LioField
          id="tenantSlug"
          label="Slug"
          hint="Ex.: tenant-b"
          value={slug}
          onChange={setSlug}
        />
        <LioField
          id="tenantName"
          label="Nome"
          value={name}
          onChange={setName}
        />
        <LioField
          id="quotaUsers"
          label="Cota de usuários"
          type="number"
          value={quotaUsers}
          onChange={setQuotaUsers}
        />
        <div className={styles.actions}>
          <LioBtnPrimary
            type="submit"
            loading={creating}
            disabled={!slug.trim() || !name.trim()}
          >
            Criar tenant
          </LioBtnPrimary>
        </div>
      </form>
    </main>
  );
}
