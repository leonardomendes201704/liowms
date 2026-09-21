import type { FastifyInstance } from "fastify";
import {
  AUTH_ERROR_FORBIDDEN,
  PLATFORM_HTTP,
  authError,
} from "@liowms/shared";
import { hasBootstrapRole } from "@liowms/shared";
import { getRequestAuth } from "../guards.js";
import {
  createTenant,
  getTenantById,
  listTenants,
  offboardTenant,
  updateTenantQuota,
} from "./tenants.js";

function requireSuperAdmin(
  auth: ReturnType<typeof getRequestAuth>,
  reply: { status: (c: number) => { send: (b: unknown) => unknown } },
) {
  if (!auth || !hasBootstrapRole(auth.user, "super_admin")) {
    reply.status(403).send(
      authError(AUTH_ERROR_FORBIDDEN, "Somente super_admin"),
    );
    return false;
  }
  return true;
}

export async function registerPlatformRoutes(app: FastifyInstance) {
  app.get(PLATFORM_HTTP.ping, async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!auth) {
      return reply.status(401).send({ message: "unauthorized" });
    }
    return reply.send({
      ok: true,
      userId: auth.user.id,
      roles: auth.user.roles,
    });
  });

  app.get(PLATFORM_HTTP.tenants, async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!requireSuperAdmin(auth, reply)) {
      return;
    }
    const tenants = await listTenants();
    return reply.send({ tenants });
  });

  app.post(PLATFORM_HTTP.tenants, async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!requireSuperAdmin(auth, reply)) {
      return;
    }
    const body = req.body as {
      slug?: string;
      name?: string;
      quotaUsers?: number;
    };
    if (!body?.slug || !body?.name) {
      return reply.status(400).send({ message: "slug e name obrigatórios" });
    }
    try {
      const tenant = await createTenant({
        slug: body.slug,
        name: body.name,
        quotaUsers: body.quotaUsers,
      });
      return reply.status(201).send({ tenant });
    } catch (err) {
      if (err instanceof Error && err.message === "quota_users_invalid") {
        return reply.status(400).send({ message: "quotaUsers inválida" });
      }
      throw err;
    }
  });

  app.get("/api/v1/platform/tenants/:tenantId", async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!requireSuperAdmin(auth, reply)) {
      return;
    }
    const { tenantId } = req.params as { tenantId: string };
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return reply.status(404).send({ message: "tenant não encontrado" });
    }
    return reply.send({ tenant });
  });

  app.patch("/api/v1/platform/tenants/:tenantId", async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!requireSuperAdmin(auth, reply)) {
      return;
    }
    const { tenantId } = req.params as { tenantId: string };
    const body = req.body as { quotaUsers?: number };
    if (body?.quotaUsers === undefined) {
      return reply.status(400).send({ message: "quotaUsers obrigatório" });
    }
    try {
      const tenant = await updateTenantQuota(tenantId, body.quotaUsers);
      if (!tenant) {
        return reply.status(404).send({
          message: "tenant não encontrado ou não pode ser alterado",
        });
      }
      return reply.send({ tenant });
    } catch (err) {
      if (err instanceof Error && err.message === "quota_users_invalid") {
        return reply.status(400).send({ message: "quotaUsers inválida" });
      }
      throw err;
    }
  });

  app.post("/api/v1/platform/tenants/:tenantId/offboard", async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!requireSuperAdmin(auth, reply)) {
      return;
    }
    const { tenantId } = req.params as { tenantId: string };
    const result = await offboardTenant({
      tenantId,
      actorUserId: auth!.user.id,
    });
    if (!result.ok) {
      const status =
        result.code === "not_found"
          ? 404
          : result.code === "forbidden"
            ? 403
            : 409;
      return reply.status(status).send({ message: result.message, code: result.code });
    }
    return reply.send({
      tenant: result.tenant,
      sessionsRevoked: result.sessionsRevoked,
    });
  });
}
