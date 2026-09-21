import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AUTH_ERROR_FORBIDDEN,
  formatAuditJson,
  formatAuditOccurredAt,
  isAuditEventsList,
  k10AuditLead,
  k10AuditTitle,
  k10EmptyMessage,
  k10LoadErrorMessage,
  tenantAuditAppPath,
  type AuditEventRecord,
} from "@liowms/shared";
import { listTenantAuditEvents } from "../api/tenant-audit-client";
import { LioField } from "../components/install-ui";
import { W16Forbidden } from "../components/w16-forbidden";
import styles from "../components/install-shell.module.css";

export function TenantAuditPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [events, setEvents] = useState<AuditEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [actorFilter, setActorFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");

  const selected =
    events.find((event) => event.id === selectedId) ?? events[0] ?? null;

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const data = await listTenantAuditEvents(tenantId, {
        actor: actorFilter || undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
      });
      if ("code" in data) {
        if (data.code === AUTH_ERROR_FORBIDDEN) {
          setForbidden(true);
          setEvents([]);
          return;
        }
        setError(data.message);
        setEvents([]);
        return;
      }
      if (isAuditEventsList(data)) {
        setEvents(data.events);
        setSelectedId((prev) => {
          if (prev && data.events.some((event) => event.id === prev)) {
            return prev;
          }
          return data.events[0]?.id ?? null;
        });
      }
    } catch {
      setError(k10LoadErrorMessage());
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, actorFilter, fromFilter, toFilter]);

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
      <h2 className={styles.sectionTitle}>{k10AuditTitle()}</h2>
      <p className={styles.sectionLead}>
        Tenant <code className={styles.inlineCode}>{tenantId}</code> ·{" "}
        <Link to={`/app/t/${tenantId}/settings`} className={styles.mockLink}>
          Configurações (K9)
        </Link>
      </p>
      <p className={styles.fieldHint}>{k10AuditLead()}</p>

      <form
        className={styles.auditFilters}
        onSubmit={(e) => {
          e.preventDefault();
          void reload();
        }}
      >
        <LioField
          id="auditActor"
          label="Ator (ID do usuário)"
          value={actorFilter}
          onChange={setActorFilter}
          autoComplete="off"
        />
        <LioField
          id="auditFrom"
          label="Período — de"
          type="date"
          value={fromFilter}
          onChange={setFromFilter}
        />
        <LioField
          id="auditTo"
          label="Período — até"
          type="date"
          value={toFilter}
          onChange={setToFilter}
        />
        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.btnGhost}
            disabled={loading}
          >
            Aplicar filtros
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            disabled={loading}
            onClick={() => {
              setActorFilter("");
              setFromFilter("");
              setToFilter("");
            }}
          >
            Limpar
          </button>
        </div>
      </form>

      {error ? (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p role="status">Carregando eventos de auditoria…</p>
      ) : events.length === 0 && !error ? (
        <p className={styles.fieldHint} role="status">
          {k10EmptyMessage()}
        </p>
      ) : (
        <div className={styles.auditLayout}>
          <div className={styles.auditTableWrap}>
            <table className={styles.auditTable}>
              <caption className={styles.auditCaption}>
                Eventos de auditoria (somente leitura)
              </caption>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Ator</th>
                  <th scope="col">Entidade</th>
                  <th scope="col">Ação</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const isSelected = selected?.id === event.id;
                  return (
                    <tr
                      key={event.id}
                      className={
                        isSelected ? styles.auditRowSelected : undefined
                      }
                    >
                      <td>
                        <button
                          type="button"
                          className={styles.auditRowButton}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedId(event.id)}
                        >
                          {formatAuditOccurredAt(event.occurredAt)}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.auditRowButton}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedId(event.id)}
                        >
                          {event.actorUserId ?? "—"}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.auditRowButton}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedId(event.id)}
                        >
                          {event.entityType}
                          {event.entityKey ? ` · ${event.entityKey}` : ""}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.auditRowButton}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedId(event.id)}
                        >
                          {event.action}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selected ? (
            <aside className={styles.auditDiffPanel} aria-label="Diff do evento">
              <h3 className={styles.sectionTitle}>Antes / depois</h3>
              <p className={styles.fieldHint}>
                Evento <code className={styles.inlineCode}>{selected.id}</code>
              </p>
              <div className={styles.grid2}>
                <div>
                  <h4 className={styles.auditDiffHeading}>Antes</h4>
                  <pre className={styles.auditDiffPre}>
                    {formatAuditJson(selected.beforeJson)}
                  </pre>
                </div>
                <div>
                  <h4 className={styles.auditDiffHeading}>Depois</h4>
                  <pre className={styles.auditDiffPre}>
                    {formatAuditJson(selected.afterJson)}
                  </pre>
                </div>
              </div>
            </aside>
          ) : null}
        </div>
      )}
    </main>
  );
}

/** Stable route helper for tests and redirects. */
export function resolveTenantAuditRoute(tenantId: string): string {
  return tenantAuditAppPath(tenantId);
}
