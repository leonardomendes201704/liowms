import type { FastifyInstance } from "fastify";
import {
  AUTH_ERROR_FORBIDDEN,
  authError,
  hasBootstrapRole,
  userCanAccessTenant,
} from "@liowms/shared";
import { getRequestAuth } from "../guards.js";
import { isTenantActive } from "../platform/tenants.js";
import {
  createPlant,
  getPlantById,
  getPlantTenantId,
  listPlants,
  updatePlant,
} from "./plants.js";

async function rejectIfTenantOffboarded(
  tenantId: string,
  reply: { status: (c: number) => { send: (b: unknown) => unknown } },
): Promise<boolean> {
  const active = await isTenantActive(tenantId);
  if (!active) {
    reply.status(403).send(
      authError(AUTH_ERROR_FORBIDDEN, "Tenant desativado (offboarding)"),
    );
    return true;
  }
  return false;
}

function assertTenantAccess(
  auth: NonNullable<ReturnType<typeof getRequestAuth>>,
  tenantId: string,
): boolean {
  return userCanAccessTenant(auth.user, tenantId);
}

export async function registerTenantRoutes(app: FastifyInstance) {
  app.get("/api/v1/tenants/:tenantId/plants", async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!auth) {
      return reply.status(401).send({ message: "unauthorized" });
    }
    const { tenantId } = req.params as { tenantId: string };
    if (!assertTenantAccess(auth, tenantId)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Acesso negado a recurso de outro tenant"),
      );
    }
    if (await rejectIfTenantOffboarded(tenantId, reply)) {
      return;
    }
    const plants = await listPlants(tenantId);
    return reply.send({ plants });
  });

  app.post("/api/v1/tenants/:tenantId/plants", async (req, reply) => {
    const auth = getRequestAuth(req);
    if (
      !auth ||
      !(
        hasBootstrapRole(auth.user, "super_admin") ||
        hasBootstrapRole(auth.user, "tenant_admin")
      )
    ) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Sem permissão para gerenciar plantas"),
      );
    }
    const { tenantId } = req.params as { tenantId: string };
    if (!assertTenantAccess(auth, tenantId)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Acesso negado a recurso de outro tenant"),
      );
    }
    if (await rejectIfTenantOffboarded(tenantId, reply)) {
      return;
    }
    const body = req.body as { slug?: string; name?: string };
    if (!body?.slug || !body?.name) {
      return reply.status(400).send({ message: "slug e name obrigatórios" });
    }
    const plant = await createPlant(tenantId, {
      slug: body.slug,
      name: body.name,
    });
    return reply.status(201).send({ plant });
  });

  app.get("/api/v1/tenants/:tenantId/plants/:plantId", async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!auth) {
      return reply.status(401).send({ message: "unauthorized" });
    }
    const { tenantId, plantId } = req.params as {
      tenantId: string;
      plantId: string;
    };
    if (!assertTenantAccess(auth, tenantId)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Acesso negado a recurso de outro tenant"),
      );
    }
    if (await rejectIfTenantOffboarded(tenantId, reply)) {
      return;
    }
    const ownerTenantId = await getPlantTenantId(plantId);
    if (!ownerTenantId) {
      return reply.status(404).send({ message: "planta não encontrada" });
    }
    if (ownerTenantId !== tenantId) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Acesso negado a recurso de outro tenant"),
      );
    }
    const plant = await getPlantById(tenantId, plantId);
    if (!plant) {
      return reply.status(404).send({ message: "planta não encontrada" });
    }
    return reply.send({ plant });
  });

  app.patch("/api/v1/tenants/:tenantId/plants/:plantId", async (req, reply) => {
    const auth = getRequestAuth(req);
    if (
      !auth ||
      !(
        hasBootstrapRole(auth.user, "super_admin") ||
        hasBootstrapRole(auth.user, "tenant_admin")
      )
    ) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Sem permissão para gerenciar plantas"),
      );
    }
    const { tenantId, plantId } = req.params as {
      tenantId: string;
      plantId: string;
    };
    if (!assertTenantAccess(auth, tenantId)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Acesso negado a recurso de outro tenant"),
      );
    }
    if (await rejectIfTenantOffboarded(tenantId, reply)) {
      return;
    }
    const ownerTenantId = await getPlantTenantId(plantId);
    if (!ownerTenantId) {
      return reply.status(404).send({ message: "planta não encontrada" });
    }
    if (ownerTenantId !== tenantId) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Acesso negado a recurso de outro tenant"),
      );
    }
    const body = req.body as { name?: string };
    const plant = await updatePlant(tenantId, plantId, body ?? {});
    if (!plant) {
      return reply.status(404).send({ message: "planta não encontrada" });
    }
    return reply.send({ plant });
  });
}
