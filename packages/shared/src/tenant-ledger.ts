/** S0.6 tenant inventory ledger API (WMS-100 / K11). */
export const IDEMPOTENCY_HEADER = "Idempotency-Key";

export const TENANT_LEDGER_HTTP = {
  transactions: "/api/v1/tenant/inventory-transactions",
  balances: "/api/v1/tenant/inventory-balances",
  movements: "/api/v1/tenant/inventory-movements",
} as const;

export interface InventoryTransactionRecord {
  id: string;
  tenantId: string;
  plantId: string;
  occurredAt: string;
  actorUserId: string | null;
  movementType: string;
  documentRef: string;
  lotCode: string;
  locationCode: string;
  quantityDelta: string;
  uom: string;
  idempotencyKey: string;
}

export interface InventoryBalanceRow {
  plantId: string;
  lotCode: string;
  locationCode: string;
  uom: string;
  balance: string;
}

export interface InventoryMovementInput {
  plantId: string;
  documentRef: string;
  lotCode: string;
  locationCode: string;
  quantityDelta: number;
  uom?: string;
  movementType?: string;
}

export interface InventoryTransactionsListResponse {
  transactions: InventoryTransactionRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface InventoryBalancesListResponse {
  balances: InventoryBalanceRow[];
}

export interface InventoryTransactionsListQuery {
  page?: number;
  limit?: number;
  lotCode?: string;
  documentRef?: string;
  plantId?: string;
  from?: string;
  to?: string;
}

export function tenantLedgerAppPath(tenantId: string): string {
  return `/app/t/${tenantId}/ledger`;
}

export function buildInventoryTransactionsUrl(
  query: InventoryTransactionsListQuery = {},
): string {
  const params = new URLSearchParams();
  if (query.lotCode?.trim()) {
    params.set("lot_code", query.lotCode.trim());
  }
  if (query.documentRef?.trim()) {
    params.set("document_ref", query.documentRef.trim());
  }
  if (query.plantId?.trim()) {
    params.set("plant_id", query.plantId.trim());
  }
  if (query.from?.trim()) {
    params.set("from", query.from.trim());
  }
  if (query.to?.trim()) {
    params.set("to", query.to.trim());
  }
  if (query.page !== undefined && Number.isFinite(query.page)) {
    params.set("page", String(Math.floor(query.page)));
  }
  if (query.limit !== undefined && Number.isFinite(query.limit)) {
    params.set("limit", String(Math.floor(query.limit)));
  }
  const qs = params.toString();
  return qs
    ? `${TENANT_LEDGER_HTTP.transactions}?${qs}`
    : TENANT_LEDGER_HTTP.transactions;
}

export function isInventoryTransactionsList(
  data: unknown,
): data is InventoryTransactionsListResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as { transactions?: unknown }).transactions)
  );
}

export function isInventoryBalancesList(
  data: unknown,
): data is InventoryBalancesListResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as { balances?: unknown }).balances)
  );
}

export function formatLedgerOccurredAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

export function k11LedgerTitle(): string {
  return "Transaction-log (K11)";
}

export function k11LedgerLead(): string {
  return "Movimentos de estoque append-only. Saldo projetado = soma dos lançamentos por lote e endereço (ADR-005). Sem edição ou exclusão de movimentos.";
}

export function k11EmptyMessage(): string {
  return "Nenhum movimento registrado neste período.";
}

export function k11LoadErrorMessage(): string {
  return "Não foi possível carregar o transaction-log.";
}
