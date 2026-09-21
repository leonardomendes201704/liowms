import type { FastifyInstance } from "fastify";
import {
  AUTH_ERROR_FORBIDDEN,
  TENANT_AUDIT_HTTP,
  authError,
  hasBootstrapRole,
  userCanAccessTenant,
  type AuditEventsListQuery,
} from "@liowms/shared";
import { getRequestAuth } from "../guards.js";
import { listTenantAuditEvents } from "./service.js";

function canViewAudit(
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
  if (hasBootstrapRole(auth.user, "super_admin") && auth.user.tenantIds[0]) {
    return auth.user.tenantIds[0];
  }
  return auth.user.tenantIds[0];
}

function parseListQuery(req: { query: Record<string, unknown> }): AuditEventsListQuery {
  const q = req.query;
  const pageRaw = q.page;
  const limitRaw = q.limit;
  return {
    page: pageRaw !== undefined ? Number(pageRaw) : undefined,
    limit: limitRaw !== undefined ? Number(limitRaw) : undefined,
    actor: typeof q.actor === "string" ? q.actor : undefined,
    entityType: typeof q.entity_type === "string" ? q.entity_type : undefined,
    from: typeof q.from === "string" ? q.from : undefined,
    to: typeof q.to === "string" ? q.to : undefined,
  };
}

const MUTATION_MESSAGE =
  "Eventos de auditoria são somente leitura (append-only)";

export async function registerAuditRoutes(app: FastifyInstance) {
  app.get(TENANT_AUDIT_HTTP.events, async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!auth || !canViewAudit(auth)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Sem permissão para ver auditoria"),
      );
    }
    const tenantId = resolveActiveTenantId(auth);
    if (!tenantId || !userCanAccessTenant(auth.user, tenantId)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Tenant ativo obrigatório"),
      );
    }
    const result = await listTenantAuditEvents(
      tenantId,
      parseListQuery({ query: req.query as Record<string, unknown> }),
    );
    return reply.send(result);
  });

  app.patch(TENANT_AUDIT_HTTP.events, async (_req, reply) => {
    return reply.status(405).send({ message: MUTATION_MESSAGE });
  });

  app.delete(TENANT_AUDIT_HTTP.events, async (_req, reply) => {
    return reply.status(405).send({ message: MUTATION_MESSAGE });
  });

  app.post(TENANT_AUDIT_HTTP.events, async (_req, reply) => {
    return reply.status(405).send({ message: MUTATION_MESSAGE });
  });
}
