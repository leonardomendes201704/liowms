import type { FastifyInstance } from "fastify";
import {
  AUTH_ERROR_FORBIDDEN,
  IDEMPOTENCY_HEADER,
  TENANT_LEDGER_HTTP,
  authError,
  hasBootstrapRole,
  userCanAccessTenant,
  type InventoryMovementInput,
  type InventoryTransactionsListQuery,
} from "@liowms/shared";
import { getRequestAuth } from "../guards.js";
import {
  appendInventoryMovement,
  listInventoryTransactions,
  listProjectedBalances,
} from "./service.js";

function canAccessLedger(
  auth: NonNullable<ReturnType<typeof getRequestAuth>>,
): boolean {
  return (
    hasBootstrapRole(auth.user, "super_admin") ||
    hasBootstrapRole(auth.user, "tenant_admin") ||
    hasBootstrapRole(auth.user, "operator")
  );
}

function resolveActiveTenantId(
  auth: NonNullable<ReturnType<typeof getRequestAuth>>,
): string | undefined {
  if (auth.activeTenantId) {
    return auth.activeTenantId;
  }
  return auth.user.tenantIds[0];
}

function parseListQuery(req: {
  query: Record<string, unknown>;
}): InventoryTransactionsListQuery {
  const q = req.query;
  return {
    page: q.page !== undefined ? Number(q.page) : undefined,
    limit: q.limit !== undefined ? Number(q.limit) : undefined,
    lotCode: typeof q.lot_code === "string" ? q.lot_code : undefined,
    documentRef: typeof q.document_ref === "string" ? q.document_ref : undefined,
    plantId: typeof q.plant_id === "string" ? q.plant_id : undefined,
    from: typeof q.from === "string" ? q.from : undefined,
    to: typeof q.to === "string" ? q.to : undefined,
  };
}

const MUTATION_MESSAGE =
  "Movimentos de estoque são somente leitura (append-only)";

export async function registerLedgerRoutes(app: FastifyInstance) {
  app.get(TENANT_LEDGER_HTTP.transactions, async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!auth || !canAccessLedger(auth)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Sem permissão para ver transaction-log"),
      );
    }
    const tenantId = resolveActiveTenantId(auth);
    if (!tenantId || !userCanAccessTenant(auth.user, tenantId)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Tenant ativo obrigatório"),
      );
    }
    const result = await listInventoryTransactions(
      tenantId,
      parseListQuery({ query: req.query as Record<string, unknown> }),
    );
    return reply.send(result);
  });

  app.get(TENANT_LEDGER_HTTP.balances, async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!auth || !canAccessLedger(auth)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Sem permissão para ver saldos"),
      );
    }
    const tenantId = resolveActiveTenantId(auth);
    if (!tenantId || !userCanAccessTenant(auth.user, tenantId)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Tenant ativo obrigatório"),
      );
    }
    const q = req.query as Record<string, unknown>;
    const balances = await listProjectedBalances(tenantId, {
      plantId: typeof q.plant_id === "string" ? q.plant_id : undefined,
      lotCode: typeof q.lot_code === "string" ? q.lot_code : undefined,
    });
    return reply.send({ balances });
  });

  app.post(TENANT_LEDGER_HTTP.movements, async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!auth || !canAccessLedger(auth)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Sem permissão para registrar movimento"),
      );
    }
    const tenantId = resolveActiveTenantId(auth);
    if (!tenantId || !userCanAccessTenant(auth.user, tenantId)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Tenant ativo obrigatório"),
      );
    }
    const idempotencyKey = req.headers[IDEMPOTENCY_HEADER.toLowerCase()];
    if (typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
      return reply.status(400).send({
        message: `Header ${IDEMPOTENCY_HEADER} obrigatório`,
      });
    }

    const body = req.body as Partial<InventoryMovementInput>;
    if (
      !body.plantId ||
      typeof body.documentRef !== "string" ||
      typeof body.lotCode !== "string" ||
      typeof body.locationCode !== "string" ||
      body.quantityDelta === undefined
    ) {
      return reply.status(400).send({ message: "Payload de movimento inválido" });
    }

    try {
      const tx = await appendInventoryMovement(
        tenantId,
        auth.user.id,
        {
          plantId: body.plantId,
          documentRef: body.documentRef,
          lotCode: body.lotCode,
          locationCode: body.locationCode,
          quantityDelta: Number(body.quantityDelta),
          uom: body.uom,
          movementType: body.movementType,
        },
        idempotencyKey.trim(),
      );
      return reply.status(201).send({ transaction: tx });
    } catch (err) {
      const code = err instanceof Error ? err.message : "MOVEMENT_FAILED";
      if (code === "PLANT_NOT_FOUND") {
        return reply.status(404).send({ message: "Planta não encontrada" });
      }
      if (code === "INVALID_MOVEMENT_FIELDS" || code === "INVALID_QUANTITY") {
        return reply.status(400).send({ message: code });
      }
      throw err;
    }
  });

  for (const path of [
    TENANT_LEDGER_HTTP.transactions,
    TENANT_LEDGER_HTTP.balances,
  ]) {
    app.patch(path, async (_req, reply) => {
      return reply.status(405).send({ message: MUTATION_MESSAGE });
    });
    app.delete(path, async (_req, reply) => {
      return reply.status(405).send({ message: MUTATION_MESSAGE });
    });
  }

  app.patch(TENANT_LEDGER_HTTP.movements, async (_req, reply) => {
    return reply.status(405).send({ message: MUTATION_MESSAGE });
  });
  app.delete(TENANT_LEDGER_HTTP.movements, async (_req, reply) => {
    return reply.status(405).send({ message: MUTATION_MESSAGE });
  });
}
