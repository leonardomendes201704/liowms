import type { FastifyInstance } from "fastify";
import {
  AUTH_ERROR_FORBIDDEN,
  TENANT_NOTIFY_HTTP,
  authError,
  hasBootstrapRole,
  userCanAccessTenant,
  type NotifyOutboxListQuery,
} from "@liowms/shared";
import { getRequestAuth } from "../guards.js";
import { listNotifyOutbox, retryNotifyOutboxMessage } from "./service.js";

function canViewNotifyOutbox(
  auth: NonNullable<ReturnType<typeof getRequestAuth>>,
): boolean {
  return (
    hasBootstrapRole(auth.user, "super_admin") ||
    hasBootstrapRole(auth.user, "tenant_admin")
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

function parseListQuery(req: { query: Record<string, unknown> }): NotifyOutboxListQuery {
  const q = req.query;
  const queueRaw = typeof q.queue === "string" ? q.queue : undefined;
  const queue =
    queueRaw === "dlq" ? "dlq" : queueRaw === "active" ? "active" : undefined;
  return {
    page: q.page !== undefined ? Number(q.page) : undefined,
    limit: q.limit !== undefined ? Number(q.limit) : undefined,
    queue,
  };
}

const MUTATION_BLOCK =
  "A fila é somente leitura; use retry seguro na rota dedicada";

export async function registerNotifyRoutes(app: FastifyInstance) {
  app.get(TENANT_NOTIFY_HTTP.outbox, async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!auth || !canViewNotifyOutbox(auth)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Sem permissão para ver outbox"),
      );
    }
    const tenantId = resolveActiveTenantId(auth);
    if (!tenantId || !userCanAccessTenant(auth.user, tenantId)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Tenant ativo obrigatório"),
      );
    }
    const result = await listNotifyOutbox(
      tenantId,
      parseListQuery({ query: req.query as Record<string, unknown> }),
    );
    return reply.send(result);
  });

  app.post<{ Params: { id: string } }>(
    "/api/v1/tenant/notify-outbox/:id/retry",
    async (req, reply) => {
      const auth = getRequestAuth(req);
      if (!auth || !canViewNotifyOutbox(auth)) {
        return reply.status(403).send(
          authError(AUTH_ERROR_FORBIDDEN, "Sem permissão para retry"),
        );
      }
      const tenantId = resolveActiveTenantId(auth);
      if (!tenantId || !userCanAccessTenant(auth.user, tenantId)) {
        return reply.status(403).send(
          authError(AUTH_ERROR_FORBIDDEN, "Tenant ativo obrigatório"),
        );
      }
      const result = await retryNotifyOutboxMessage(tenantId, req.params.id);
      if (!result.ok) {
        const status = result.code === "NOT_FOUND" ? 404 : 409;
        return reply.status(status).send({
          code: result.code,
          message: result.message,
        });
      }
      return reply.send({ item: result.item });
    },
  );

  app.patch(TENANT_NOTIFY_HTTP.outbox, async (_req, reply) => {
    return reply.status(405).send({ message: MUTATION_BLOCK });
  });

  app.delete(TENANT_NOTIFY_HTTP.outbox, async (_req, reply) => {
    return reply.status(405).send({ message: MUTATION_BLOCK });
  });
}
