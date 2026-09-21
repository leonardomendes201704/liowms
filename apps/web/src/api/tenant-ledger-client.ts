import type {
  AuthErrorBody,
  InventoryBalancesListResponse,
  InventoryMovementInput,
  InventoryTransactionRecord,
  InventoryTransactionsListQuery,
  InventoryTransactionsListResponse,
} from "@liowms/shared";
import {
  IDEMPOTENCY_HEADER,
  TENANT_CONTEXT_HEADER,
  TENANT_LEDGER_HTTP,
  buildInventoryTransactionsUrl,
} from "@liowms/shared";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error("Resposta vazia do servidor");
  }
  return JSON.parse(text) as T;
}

function tenantHeaders(
  tenantId: string,
  extra?: Record<string, string>,
): HeadersInit {
  return {
    "Content-Type": "application/json",
    [TENANT_CONTEXT_HEADER]: tenantId,
    ...extra,
  };
}

export async function listInventoryTransactions(
  tenantId: string,
  query: InventoryTransactionsListQuery = {},
): Promise<InventoryTransactionsListResponse | AuthErrorBody> {
  const res = await fetch(buildInventoryTransactionsUrl(query), {
    credentials: "include",
    headers: tenantHeaders(tenantId),
  });
  return readJson(res);
}

export async function listInventoryBalances(
  tenantId: string,
  query: { plantId?: string; lotCode?: string } = {},
): Promise<InventoryBalancesListResponse | AuthErrorBody> {
  const params = new URLSearchParams();
  if (query.plantId) params.set("plant_id", query.plantId);
  if (query.lotCode) params.set("lot_code", query.lotCode);
  const qs = params.toString();
  const url = qs
    ? `${TENANT_LEDGER_HTTP.balances}?${qs}`
    : TENANT_LEDGER_HTTP.balances;
  const res = await fetch(url, {
    credentials: "include",
    headers: tenantHeaders(tenantId),
  });
  return readJson(res);
}

export async function postInventoryMovement(
  tenantId: string,
  input: InventoryMovementInput,
  idempotencyKey: string,
): Promise<
  { transaction: InventoryTransactionRecord } | AuthErrorBody
> {
  const res = await fetch(TENANT_LEDGER_HTTP.movements, {
    method: "POST",
    credentials: "include",
    headers: tenantHeaders(tenantId, {
      [IDEMPOTENCY_HEADER]: idempotencyKey,
    }),
    body: JSON.stringify(input),
  });
  return readJson(res);
}
