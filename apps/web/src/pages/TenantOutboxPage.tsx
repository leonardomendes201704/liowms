import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AUTH_ERROR_FORBIDDEN,
  formatAuditJson,
  formatNotifyTimestamp,
  isNotifyOutboxList,
  k14EmptyActiveMessage,
  k14EmptyDlqMessage,
  k14LoadErrorMessage,
  k14OutboxLead,
  k14OutboxTitle,
  k14RetrySuccessMessage,
  type NotifyOutboxRecord,
} from "@liowms/shared";
import {
  listTenantNotifyOutbox,
  retryTenantNotifyOutbox,
} from "../api/tenant-notify-client";
import { W16Forbidden } from "../components/w16-forbidden";
import styles from "../components/install-shell.module.css";

type QueueTab = "active" | "dlq";

export function TenantOutboxPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tab, setTab] = useState<QueueTab>("active");
  const [items, setItems] = useState<NotifyOutboxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const selected =
    items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    setStatusMessage(null);
    try {
      const data = await listTenantNotifyOutbox(tenantId, { queue: tab });
      if ("code" in data) {
        if (data.code === AUTH_ERROR_FORBIDDEN) {
          setForbidden(true);
          setItems([]);
          return;
        }
        setError(data.message);
        setItems([]);
        return;
      }
      if (isNotifyOutboxList(data)) {
        setItems(data.items);
        setSelectedId((prev) => {
          if (prev && data.items.some((item) => item.id === prev)) {
            return prev;
          }
          return data.items[0]?.id ?? null;
        });
      }
    } catch {
      setError(k14LoadErrorMessage());
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, tab]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onRetry(messageId: string) {
    if (!tenantId) return;
    setRetrying(true);
    setStatusMessage(null);
    try {
      const result = await retryTenantNotifyOutbox(tenantId, messageId);
      if ("code" in result) {
        setError(result.message);
        return;
      }
      setStatusMessage(k14RetrySuccessMessage());
      await reload();
    } catch {
      setError(k14LoadErrorMessage());
    } finally {
      setRetrying(false);
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
      <h2 className={styles.sectionTitle}>{k14OutboxTitle()}</h2>
      <p className={styles.sectionLead}>
        Tenant <code className={styles.inlineCode}>{tenantId}</code> ·{" "}
        <Link to={`/app/t/${tenantId}/settings`} className={styles.mockLink}>
          SMTP (K9)
        </Link>
      </p>
      <p className={styles.fieldHint}>{k14OutboxLead()}</p>

      <div className={styles.auditFilters}>
        <button
          type="button"
          className={tab === "active" ? styles.btnPrimary : styles.btnGhost}
          onClick={() => setTab("active")}
        >
          Fila ativa
        </button>
        <button
          type="button"
          className={tab === "dlq" ? styles.btnPrimary : styles.btnGhost}
          onClick={() => setTab("dlq")}
        >
          DLQ
        </button>
      </div>

      {statusMessage ? (
        <p className={styles.successMessage}>{statusMessage}</p>
      ) : null}
      {error ? <p className={styles.errorBanner}>{error}</p> : null}

      {loading ? (
        <p>Carregando fila…</p>
      ) : items.length === 0 ? (
        <p>{tab === "dlq" ? k14EmptyDlqMessage() : k14EmptyActiveMessage()}</p>
      ) : (
        <div className={styles.auditLayout}>
          <ul className={styles.auditList}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={
                    item.id === selected?.id
                      ? styles.auditListItemActive
                      : styles.auditListItem
                  }
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className={styles.auditListPrimary}>{item.kind}</span>
                  <span className={styles.auditListMeta}>
                    {formatNotifyTimestamp(item.createdAt)} · {item.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {selected ? (
            <div className={styles.auditDetail}>
              <h3 className={styles.subsectionTitle}>Detalhe</h3>
              <dl className={styles.auditMetaGrid}>
                <div>
                  <dt>Status</dt>
                  <dd>{selected.status}</dd>
                </div>
                <div>
                  <dt>Tentativas</dt>
                  <dd>{selected.attempts}</dd>
                </div>
                <div>
                  <dt>Último erro</dt>
                  <dd>{selected.lastError ?? "—"}</dd>
                </div>
              </dl>
              <pre className={styles.auditJsonPanel}>
                {formatAuditJson(selected.payloadSummary)}
              </pre>
              {tab === "dlq" ||
              selected.status === "dlq" ||
              selected.status === "failed" ? (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={retrying}
                  onClick={() => void onRetry(selected.id)}
                >
                  Reenfileirar (retry seguro)
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
