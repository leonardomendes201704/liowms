import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { TenantPlant } from "@liowms/shared";
import { AUTH_ERROR_FORBIDDEN, hasBootstrapRole } from "@liowms/shared";
import { createTenantPlant, listTenantPlants } from "../api/tenant-client";
import { useAuth } from "../auth/AuthProvider";
import { LioBtnPrimary, LioField } from "../components/install-ui";
import { W16Forbidden } from "../components/w16-forbidden";
import styles from "../components/install-shell.module.css";

function isPlantList(data: unknown): data is { plants: TenantPlant[] } {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as { plants?: unknown }).plants)
  );
}

export function TenantPlantsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { user } = useAuth();
  const canManagePlants = user ? hasBootstrapRole(user, "tenant_admin") : false;
  const [plants, setPlants] = useState<TenantPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const data = await listTenantPlants(tenantId);
      if ("code" in data) {
        if (data.code === AUTH_ERROR_FORBIDDEN) {
          setForbidden(true);
          return;
        }
        setError(data.message);
        return;
      }
      if (isPlantList(data)) {
        setPlants(data.plants);
      }
    } catch {
      setError("Não foi possível carregar plantas.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createTenantPlant(tenantId, {
        slug: slug.trim(),
        name: name.trim(),
      });
      if ("code" in result) {
        if (result.code === AUTH_ERROR_FORBIDDEN) {
          setForbidden(true);
          return;
        }
        setError(result.message);
        return;
      }
      if ("plant" in result) {
        setSlug("");
        setName("");
        await reload();
      }
    } catch {
      setError("Falha ao criar planta.");
    } finally {
      setCreating(false);
    }
  }

  if (forbidden) {
    return (
      <main className={styles.card}>
        <W16Forbidden reason="cross_tenant" />
      </main>
    );
  }

  return (
    <main className={styles.card}>
      <h2 className={styles.sectionTitle}>Plantas do tenant (K7)</h2>
      <p className={styles.sectionLead}>
        Tenant <code className={styles.inlineCode}>{tenantId}</code>
        {canManagePlants ? (
          <>
            {" · "}
            <Link to={`/app/t/${tenantId}/invite`} className={styles.mockLink}>
              Convites (K13)
            </Link>
            {" · "}
            <Link to={`/app/t/${tenantId}/settings`} className={styles.mockLink}>
              Configurações (K9)
            </Link>
          </>
        ) : null}
      </p>

      {error ? (
        <p className={styles.errorMessage} role="alert">{error}</p>
      ) : null}

      {loading ? (
        <p>Carregando plantas…</p>
      ) : (
        <ul className={styles.tenantList}>
          {plants.length === 0 ? (
            <li className={styles.tenantListItem}>Nenhuma planta cadastrada.</li>
          ) : (
            plants.map((p) => (
              <li key={p.id} className={styles.tenantListItem}>
                <strong>{p.name}</strong>
                <span className={styles.tenantMeta}>{p.slug}</span>
              </li>
            ))
          )}
        </ul>
      )}

      {canManagePlants ? (
        <form className={styles.formStack} onSubmit={onCreate}>
          <h3 className={styles.sectionTitle}>Nova planta</h3>
          <LioField id="plantSlug" label="Slug" value={slug} onChange={setSlug} />
          <LioField id="plantName" label="Nome" value={name} onChange={setName} />
          <div className={styles.actions}>
            <LioBtnPrimary
              type="submit"
              loading={creating}
              disabled={!slug.trim() || !name.trim()}
            >
              Criar planta
            </LioBtnPrimary>
          </div>
        </form>
      ) : null}
    </main>
  );
}
