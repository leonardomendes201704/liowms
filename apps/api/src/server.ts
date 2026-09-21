import Fastify from "fastify";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerHealthRoutes } from "./health/routes.js";
import { registerInstallRoutes } from "./install/routes.js";
import { registerInstallGuards } from "./guards.js";
import { registerPlatformRoutes } from "./platform/routes.js";
import { registerConfigRoutes } from "./config/routes.js";
import { registerAuditRoutes } from "./audit/routes.js";
import { registerLedgerRoutes } from "./ledger/routes.js";
import { registerNotifyRoutes } from "./notify/routes.js";
import { registerTelemetryRoutes } from "./telemetry/routes.js";
import { registerTenantRoutes } from "./tenant/routes.js";
import {
  applyPendingMigrationsOnStartup,
  refreshRuntimePoolFromInfra,
} from "./install/state.js";

export async function buildServer() {
  await refreshRuntimePoolFromInfra();
  await applyPendingMigrationsOnStartup();

  const app = Fastify({
    logger: false,
    bodyLimit: 64 * 1024,
  });

  await registerHealthRoutes(app);
  await registerInstallRoutes(app);
  await registerAuthRoutes(app);
  await registerPlatformRoutes(app);
  await registerTenantRoutes(app);
  await registerConfigRoutes(app);
  await registerAuditRoutes(app);
  await registerLedgerRoutes(app);
  await registerNotifyRoutes(app);
  await registerTelemetryRoutes(app);
  await registerInstallGuards(app);

  return app;
}
