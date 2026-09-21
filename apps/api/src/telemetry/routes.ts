import type { FastifyInstance } from "fastify";
import {
  AUTH_ERROR_FORBIDDEN,
  HEALTH_CONTRACT,
  TENANT_KERNEL_HTTP,
  authError,
  buildHealthResponse,
  hasBootstrapRole,
  userCanAccessTenant,
  type TenantKernelStatusResponse,
} from "@liowms/shared";
import { getTenantSettings } from "../config/service.js";
import { getRequestAuth } from "../guards.js";
import { resolveGlobalOutboxQueueHealth } from "../health/queues.js";
import { resolveInstallState } from "../install/state.js";
import { API_VERSION } from "../version.js";
import { resolveTenantOtlpHook } from "./otlp.js";
import {
  buildTenantTelemetryExport,
  countTenantOutboxByStatus,
  listTenantTelemetryAggregates,
} from "./service.js";

function canViewKernelStatus(
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

const TENANT_OUTBOX_DEGRADED_PENDING = 10;
const TENANT_OUTBOX_DEGRADED_DLQ = 1;

export async function registerTelemetryRoutes(app: FastifyInstance) {
  app.get(TENANT_KERNEL_HTTP.status, async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!auth || !canViewKernelStatus(auth)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Sem permissão para ver telemetria"),
      );
    }
    const tenantId = resolveActiveTenantId(auth);
    if (!tenantId || !userCanAccessTenant(auth.user, tenantId)) {
      return reply.status(403).send(
        authError(AUTH_ERROR_FORBIDDEN, "Tenant ativo obrigatório"),
      );
    }

    const install = await resolveInstallState();
    const queues = await resolveGlobalOutboxQueueHealth(install.installed);
    const health = buildHealthResponse({
      installed: install.installed,
      phase: install.phase,
      version: API_VERSION,
      migrationsApplied: install.migrationsApplied,
      migrationsLatest: install.migrationsLatest,
      queuesReady: queues.ready,
      queuesDetail: queues.detail,
    });

    const outboxCounts = await countTenantOutboxByStatus(tenantId);
    const aggregates = await listTenantTelemetryAggregates(tenantId);
    const exportPreview = await buildTenantTelemetryExport(tenantId);
    const settings = await getTenantSettings(tenantId);
    const otlp = resolveTenantOtlpHook(settings);

    const body: TenantKernelStatusResponse = {
      contract: "k12-kernel.v1",
      health: {
        contract: HEALTH_CONTRACT,
        status: health.status,
        migrations: health.migrations,
        queues: health.queues,
      },
      outbox: {
        pending: outboxCounts.pending,
        dlq: outboxCounts.dlq,
        backlogDegraded:
          outboxCounts.pending >= TENANT_OUTBOX_DEGRADED_PENDING ||
          outboxCounts.dlq >= TENANT_OUTBOX_DEGRADED_DLQ,
      },
      aggregates,
      otlp,
      exportPreview,
    };

    return reply.send(body);
  });
}
