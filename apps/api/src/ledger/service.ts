import type {
  InventoryBalanceRow,
  InventoryMovementInput,
  InventoryTransactionRecord,
  InventoryTransactionsListQuery,
} from "@liowms/shared";
import { withDbScope } from "../db/tenant-scope.js";

interface TxRow {
  id: string;
  tenant_id: string;
  plant_id: string;
  occurred_at: Date;
  actor_user_id: string | null;
  movement_type: string;
  document_ref: string;
  lot_code: string;
  location_code: string;
  quantity_delta: string;
  uom: string;
  idempotency_key: string;
}

interface BalanceRow {
  plant_id: string;
  lot_code: string;
  location_code: string;
  uom: string;
  balance: string;
}

function mapTx(row: TxRow): InventoryTransactionRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    plantId: row.plant_id,
    occurredAt: row.occurred_at.toISOString(),
    actorUserId: row.actor_user_id,
    movementType: row.movement_type,
    documentRef: row.document_ref,
    lotCode: row.lot_code,
    locationCode: row.location_code,
    quantityDelta: row.quantity_delta,
    uom: row.uom,
    idempotencyKey: row.idempotency_key,
  };
}

function mapBalance(row: BalanceRow): InventoryBalanceRow {
  return {
    plantId: row.plant_id,
    lotCode: row.lot_code,
    locationCode: row.location_code,
    uom: row.uom,
    balance: row.balance,
  };
}

export async function findTransactionByIdempotency(
  tenantId: string,
  idempotencyKey: string,
): Promise<InventoryTransactionRecord | null> {
  return withDbScope({ tenantId }, async (client) => {
    const res = await client.query<TxRow>(
      `SELECT id, tenant_id, plant_id, occurred_at, actor_user_id, movement_type,
              document_ref, lot_code, location_code, quantity_delta::text, uom, idempotency_key
       FROM ledger.inventory_transactions
       WHERE idempotency_key = $1`,
      [idempotencyKey],
    );
    const row = res.rows[0];
    return row ? mapTx(row) : null;
  });
}

export async function appendInventoryMovement(
  tenantId: string,
  actorUserId: string,
  input: InventoryMovementInput,
  idempotencyKey: string,
): Promise<InventoryTransactionRecord> {
  const existing = await findTransactionByIdempotency(tenantId, idempotencyKey);
  if (existing) {
    return existing;
  }

  const documentRef = input.documentRef.trim();
  const lotCode = input.lotCode.trim();
  const locationCode = input.locationCode.trim();
  const uom = (input.uom ?? "UN").trim() || "UN";
  const movementType = (input.movementType ?? "kernel").trim() || "kernel";

  if (!documentRef || !lotCode || !locationCode) {
    throw new Error("INVALID_MOVEMENT_FIELDS");
  }
  if (!Number.isFinite(input.quantityDelta) || input.quantityDelta === 0) {
    throw new Error("INVALID_QUANTITY");
  }

  return withDbScope({ tenantId }, async (client) => {
    const plantCheck = await client.query(
      `SELECT 1 FROM plants WHERE id = $1 AND tenant_id = $2`,
      [input.plantId, tenantId],
    );
    if (!plantCheck.rowCount) {
      throw new Error("PLANT_NOT_FOUND");
    }

    const res = await client.query<TxRow>(
      `INSERT INTO ledger.inventory_transactions (
         tenant_id, plant_id, actor_user_id, movement_type, document_ref,
         lot_code, location_code, quantity_delta, uom, idempotency_key
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, tenant_id, plant_id, occurred_at, actor_user_id, movement_type,
                 document_ref, lot_code, location_code, quantity_delta::text, uom, idempotency_key`,
      [
        tenantId,
        input.plantId,
        actorUserId,
        movementType,
        documentRef,
        lotCode,
        locationCode,
        input.quantityDelta,
        uom,
        idempotencyKey,
      ],
    );
    return mapTx(res.rows[0]);
  });
}

export async function listInventoryTransactions(
  tenantId: string,
  query: InventoryTransactionsListQuery,
): Promise<{
  transactions: InventoryTransactionRecord[];
  page: number;
  limit: number;
  total: number;
}> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(query.limit ?? 25)));
  const offset = (page - 1) * limit;

  const conditions: string[] = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];
  let paramIdx = 2;

  if (query.lotCode?.trim()) {
    conditions.push(`lot_code = $${paramIdx}`);
    params.push(query.lotCode.trim());
    paramIdx += 1;
  }
  if (query.documentRef?.trim()) {
    conditions.push(`document_ref = $${paramIdx}`);
    params.push(query.documentRef.trim());
    paramIdx += 1;
  }
  if (query.plantId?.trim()) {
    conditions.push(`plant_id = $${paramIdx}::uuid`);
    params.push(query.plantId.trim());
    paramIdx += 1;
  }
  if (query.from?.trim()) {
    conditions.push(`occurred_at >= $${paramIdx}::timestamptz`);
    params.push(query.from.trim());
    paramIdx += 1;
  }
  if (query.to?.trim()) {
    conditions.push(`occurred_at <= $${paramIdx}::timestamptz`);
    params.push(query.to.trim());
    paramIdx += 1;
  }

  const where = conditions.join(" AND ");

  return withDbScope({ tenantId }, async (client) => {
    const countRes = await client.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM ledger.inventory_transactions WHERE ${where}`,
      params,
    );
    const total = countRes.rows[0]?.c ?? 0;

    const listParams = [...params, limit, offset];
    const res = await client.query<TxRow>(
      `SELECT id, tenant_id, plant_id, occurred_at, actor_user_id, movement_type,
              document_ref, lot_code, location_code, quantity_delta::text, uom, idempotency_key
       FROM ledger.inventory_transactions
       WHERE ${where}
       ORDER BY occurred_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      listParams,
    );

    return {
      transactions: res.rows.map(mapTx),
      page,
      limit,
      total,
    };
  });
}

export async function listProjectedBalances(
  tenantId: string,
  query: { plantId?: string; lotCode?: string },
): Promise<InventoryBalanceRow[]> {
  const conditions: string[] = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];
  let paramIdx = 2;

  if (query.plantId?.trim()) {
    conditions.push(`plant_id = $${paramIdx}::uuid`);
    params.push(query.plantId.trim());
    paramIdx += 1;
  }
  if (query.lotCode?.trim()) {
    conditions.push(`lot_code = $${paramIdx}`);
    params.push(query.lotCode.trim());
    paramIdx += 1;
  }

  const where = conditions.join(" AND ");

  return withDbScope({ tenantId }, async (client) => {
    const res = await client.query<BalanceRow>(
      `SELECT plant_id, lot_code, location_code, uom,
              SUM(quantity_delta)::text AS balance
       FROM ledger.inventory_transactions
       WHERE ${where}
       GROUP BY plant_id, lot_code, location_code, uom
       HAVING SUM(quantity_delta) <> 0
       ORDER BY lot_code, location_code`,
      params,
    );
    return res.rows.map(mapBalance);
  });
}

/** Sum of quantity_delta for a lot (all locations) — used in J0e-01 reconciliation. */
export async function sumLotQuantity(
  tenantId: string,
  lotCode: string,
): Promise<string> {
  return withDbScope({ tenantId }, async (client) => {
    const res = await client.query<{ s: string | null }>(
      `SELECT COALESCE(SUM(quantity_delta), 0)::text AS s
       FROM ledger.inventory_transactions
       WHERE lot_code = $1`,
      [lotCode.trim()],
    );
    return res.rows[0]?.s ?? "0";
  });
}
