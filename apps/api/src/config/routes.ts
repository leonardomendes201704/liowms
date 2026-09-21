import type { FastifyInstance } from "fastify";
import {
  AUTH_ERROR_FORBIDDEN,
  TENANT_SETTINGS_HTTP,
  authError,
  hasBootstrapRole,
  userCanAccessTenant,
} from "@liowms/shared";
import type { TenantSettingsPatchBody } from "@liowms/shared";
import { getRequestAuth } from "../guards.js";
import { getTenantSettings, patchTenantSettings } from "./service.js";

function canManageSettings(
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

export async function registerConfigRoutes(app: FastifyInstance) {
  app.get(TENANT_SETTINGS_HTTP.settings, async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!auth || !canManageSettings(auth)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Sem permissão para ver configurações"),
      );
    }
    const tenantId = resolveActiveTenantId(auth);
    if (!tenantId || !userCanAccessTenant(auth.user, tenantId)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Tenant ativo obrigatório"),
      );
    }
    const settings = await getTenantSettings(tenantId);
    return reply.send({ settings });
  });

  app.patch(TENANT_SETTINGS_HTTP.settings, async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!auth || !canManageSettings(auth)) {
      return reply.status(403).send(
        authError(
          AUTH_ERROR_FORBIDDEN,
          "Sem permissão para alterar configurações",
        ),
      );
    }
    const tenantId = resolveActiveTenantId(auth);
    if (!tenantId || !userCanAccessTenant(auth.user, tenantId)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Tenant ativo obrigatório"),
      );
    }
    const body = (req.body ?? {}) as TenantSettingsPatchBody;
    try {
      const settings = await patchTenantSettings(tenantId, body, {
        actorUserId: auth.user.id,
      });
      return reply.send({ settings });
    } catch (err) {
      const message = err instanceof Error ? err.message : "invalid_settings";
      if (message.startsWith("INVALID_") || message.startsWith("EMPTY_")) {
        return reply.status(400).send({ message });
      }
      throw err;
    }
  });
}
