import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AUTH_ERROR_FORBIDDEN,
  formatAuditJson,
  isTenantKernelStatusResponse,
  k12KernelLead,
  k12KernelLoadErrorMessage,
  k12KernelTitle,
  k12OtlpHookLabel,
  k12OutboxDegradedHint,
  type TenantKernelStatusResponse,
} from "@liowms/shared";
import { fetchTenantKernelStatus } from "../api/tenant-kernel-client";
import { W16Forbidden } from "../components/w16-forbidden";
import styles from "../components/install-shell.module.css";

export function TenantKernelHealthPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TenantKernelStatusResponse | null>(null);

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const data = await fetchTenantKernelStatus(tenantId);
      if ("code" in data) {
        if (data.code === AUTH_ERROR_FORBIDDEN) {
          setForbidden(true);
          setStatus(null);
          return;
        }
        setError(data.message);
        setStatus(null);
        return;
      }
      if (isTenantKernelStatusResponse(data)) {
        setStatus(data);
      }
    } catch {
      setError(k12KernelLoadErrorMessage());
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (forbidden) {
    return (
      <main className={styles.card}>
        <W16Forbidden reason="forbidden" />
      </main>
    );
  }

  return (
    <main className={styles.card}>
      <h2 className={styles.sectionTitle}>{k12KernelTitle()}</h2>
      <p className={styles.sectionLead}>
        Tenant <code className={styles.inlineCode}>{tenantId}</code> ·{" "}
        <Link to={`/app/t/${tenantId}/outbox`} className={styles.mockLink}>
          Fila e-mail (K14)
        </Link>
      </p>
      <p className={styles.fieldHint}>{k12KernelLead()}</p>

      {error ? <p className={styles.errorBanner}>{error}</p> : null}
      {loading ? (
        <p>Carregando status…</p>
      ) : status ? (
        <>
          {status.outbox.backlogDegraded ? (
            <p className={styles.errorBanner}>{k12OutboxDegradedHint()}</p>
          ) : null}
          <dl className={styles.auditMetaGrid}>
            <div>
              <dt>Health</dt>
              <dd>{status.health.status}</dd>
            </div>
            <div>
              <dt>Migrations</dt>
              <dd>
                {status.health.migrations.applied ?? "—"} /{" "}
                {status.health.migrations.latest ?? "—"}
              </dd>
            </div>
            <div>
              <dt>Filas (global)</dt>
              <dd>{status.health.queues.detail}</dd>
            </div>
            <div>
              <dt>Outbox tenant</dt>
              <dd>
                pending {status.outbox.pending} · DLQ {status.outbox.dlq}
              </dd>
            </div>
            <div>
              <dt>{k12OtlpHookLabel()}</dt>
              <dd>
                {status.otlp.configured
                  ? `${status.otlp.source} · ${status.otlp.endpointHost ?? "endpoint"}`
                  : "não configurado"}
              </dd>
            </div>
          </dl>
          <h3 className={styles.subsectionTitle}>Contadores agregados</h3>
          {status.aggregates.length === 0 ? (
            <p>Sem contadores ainda.</p>
          ) : (
            <ul className={styles.auditList}>
              {status.aggregates.map((row) => (
                <li key={row.metricKey}>
                  <span className={styles.auditListPrimary}>{row.metricKey}</span>
                  <span className={styles.auditListMeta}>{row.count}</span>
                </li>
              ))}
            </ul>
          )}
          <h3 className={styles.subsectionTitle}>Export preview (read-only)</h3>
          <pre className={styles.auditJsonPanel}>
            {formatAuditJson(status.exportPreview)}
          </pre>
        </>
      ) : null}
    </main>
  );
}
