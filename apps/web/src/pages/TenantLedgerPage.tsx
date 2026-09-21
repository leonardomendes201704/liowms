import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AUTH_ERROR_FORBIDDEN,
  formatLedgerOccurredAt,
  isInventoryBalancesList,
  isInventoryTransactionsList,
  k11EmptyMessage,
  k11LedgerLead,
  k11LedgerTitle,
  k11LoadErrorMessage,
  tenantLedgerAppPath,
  type InventoryBalanceRow,
  type InventoryTransactionRecord,
} from "@liowms/shared";
import {
  listInventoryBalances,
  listInventoryTransactions,
  postInventoryMovement,
} from "../api/tenant-ledger-client";
import { listTenantPlants } from "../api/tenant-client";
import { LioField } from "../components/install-ui";
import { W16Forbidden } from "../components/w16-forbidden";
import styles from "../components/install-shell.module.css";

export function TenantLedgerPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [transactions, setTransactions] = useState<InventoryTransactionRecord[]>(
    [],
  );
  const [balances, setBalances] = useState<InventoryBalanceRow[]>([]);
  const [plantId, setPlantId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lotFilter, setLotFilter] = useState("");
  const [documentFilter, setDocumentFilter] = useState("");

  const [moveLot, setMoveLot] = useState("");
  const [moveDoc, setMoveDoc] = useState("");
  const [moveLocation, setMoveLocation] = useState("");
  const [moveQty, setMoveQty] = useState("");
  const [moveStatus, setMoveStatus] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const plantsRes = await listTenantPlants(tenantId);
      if ("plants" in plantsRes && plantsRes.plants[0] && !plantId) {
        setPlantId(plantsRes.plants[0].id);
      }

      const txData = await listInventoryTransactions(tenantId, {
        lotCode: lotFilter || undefined,
        documentRef: documentFilter || undefined,
      });
      if ("code" in txData) {
        if (txData.code === AUTH_ERROR_FORBIDDEN) {
          setForbidden(true);
          setTransactions([]);
          setBalances([]);
          return;
        }
        setError(txData.message);
        setTransactions([]);
        return;
      }
      if (isInventoryTransactionsList(txData)) {
        setTransactions(txData.transactions);
      }

      const balData = await listInventoryBalances(tenantId, {
        lotCode: lotFilter || undefined,
      });
      if ("code" in balData) {
        if (balData.code !== AUTH_ERROR_FORBIDDEN) {
          setError(balData.message);
        }
        return;
      }
      if (isInventoryBalancesList(balData)) {
        setBalances(balData.balances);
      }
    } catch {
      setError(k11LoadErrorMessage());
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, lotFilter, documentFilter, plantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onRegisterMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !plantId) return;
    setMoveStatus(null);
    const qty = Number(moveQty);
    if (!Number.isFinite(qty) || qty === 0) {
      setMoveStatus("Quantidade inválida");
      return;
    }
    const key = `ui-${tenantId}-${Date.now()}`;
    const res = await postInventoryMovement(
      tenantId,
      {
        plantId,
        documentRef: moveDoc,
        lotCode: moveLot,
        locationCode: moveLocation,
        quantityDelta: qty,
      },
      key,
    );
    if ("code" in res) {
      setMoveStatus(res.message);
      return;
    }
    setMoveStatus("Movimento registrado.");
    setMoveLot("");
    setMoveDoc("");
    setMoveLocation("");
    setMoveQty("");
    void reload();
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
      <h2 className={styles.sectionTitle}>{k11LedgerTitle()}</h2>
      <p className={styles.sectionLead}>
        Tenant <code className={styles.inlineCode}>{tenantId}</code> ·{" "}
        <Link to={`/app/t/${tenantId}/audit`} className={styles.mockLink}>
          Auditoria (K10)
        </Link>
      </p>
      <p className={styles.fieldHint}>{k11LedgerLead()}</p>

      <form
        className={styles.auditFilters}
        onSubmit={(e) => {
          e.preventDefault();
          void reload();
        }}
      >
        <LioField
          id="ledgerLot"
          label="Lote"
          value={lotFilter}
          onChange={setLotFilter}
          autoComplete="off"
        />
        <LioField
          id="ledgerDoc"
          label="Documento"
          value={documentFilter}
          onChange={setDocumentFilter}
          autoComplete="off"
        />
        <div className={styles.actions}>
          <button type="submit" className={styles.btnGhost} disabled={loading}>
            Aplicar filtros
          </button>
        </div>
      </form>

      {error ? (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      ) : null}

      <section aria-label="Saldos projetados">
        <h3 className={styles.sectionTitle}>Saldo projetado</h3>
        {balances.length === 0 ? (
          <p className={styles.fieldHint}>Nenhum saldo (Σ lançamentos = 0).</p>
        ) : (
          <table className={styles.auditTable}>
            <thead>
              <tr>
                <th scope="col">Lote</th>
                <th scope="col">Endereço</th>
                <th scope="col">UoM</th>
                <th scope="col">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((row) => (
                <tr key={`${row.lotCode}-${row.locationCode}-${row.uom}`}>
                  <td>{row.lotCode}</td>
                  <td>{row.locationCode}</td>
                  <td>{row.uom}</td>
                  <td>{row.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {loading ? (
        <p role="status">Carregando transaction-log…</p>
      ) : transactions.length === 0 && !error ? (
        <p className={styles.fieldHint} role="status">
          {k11EmptyMessage()}
        </p>
      ) : (
        <div className={styles.auditTableWrap}>
          <table className={styles.auditTable}>
            <caption className={styles.auditCaption}>
              Movimentos (somente leitura)
            </caption>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Documento</th>
                <th scope="col">Lote</th>
                <th scope="col">Endereço</th>
                <th scope="col">Δ Qtd</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{formatLedgerOccurredAt(tx.occurredAt)}</td>
                  <td>{tx.documentRef}</td>
                  <td>{tx.lotCode}</td>
                  <td>{tx.locationCode}</td>
                  <td>{tx.quantityDelta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className={styles.auditDiffPanel} aria-label="Movimento kernel">
        <h3 className={styles.sectionTitle}>Registrar movimento (kernel S0.6)</h3>
        <p className={styles.fieldHint}>
          POST com <code className={styles.inlineCode}>Idempotency-Key</code> —
          formulário de apoio para staging/QA.
        </p>
        <form onSubmit={(e) => void onRegisterMovement(e)}>
          <LioField
            id="moveDoc"
            label="Documento"
            value={moveDoc}
            onChange={setMoveDoc}
          />
          <LioField
            id="moveLot"
            label="Lote"
            value={moveLot}
            onChange={setMoveLot}
          />
          <LioField
            id="moveLoc"
            label="Endereço"
            value={moveLocation}
            onChange={setMoveLocation}
          />
          <LioField
            id="moveQty"
            label="Δ quantidade"
            type="number"
            value={moveQty}
            onChange={setMoveQty}
          />
          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={!plantId}
            >
              Registrar
            </button>
          </div>
          {moveStatus ? (
            <p className={styles.fieldHint} role="status">{moveStatus}</p>
          ) : null}
        </form>
      </section>
    </main>
  );
}

export function resolveTenantLedgerRoute(tenantId: string): string {
  return tenantLedgerAppPath(tenantId);
}
