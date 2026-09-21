import type { FastifyInstance } from "fastify";
import {
  AUTH_ERROR_FORBIDDEN,
  PLATFORM_HTTP,
  authError,
} from "@liowms/shared";
import { hasBootstrapRole } from "@liowms/shared";
import { getRequestAuth } from "../guards.js";
import { createTenant, listTenants } from "./tenants.js";

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
    if (!auth || !hasBootstrapRole(auth.user, "super_admin")) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Somente super_admin"),
      );
    }
    const tenants = await listTenants();
    return reply.send({ tenants });
  });

  app.post(PLATFORM_HTTP.tenants, async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!auth || !hasBootstrapRole(auth.user, "super_admin")) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Somente super_admin"),
      );
    }
    const body = req.body as { slug?: string; name?: string };
    if (!body?.slug || !body?.name) {
      return reply.status(400).send({ message: "slug e name obrigatórios" });
    }
    const tenant = await createTenant({ slug: body.slug, name: body.name });
    return reply.status(201).send({ tenant, quotas: { plants: null } });
  });
}
