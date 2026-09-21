import Fastify from "fastify";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerHealthRoutes } from "./health/routes.js";
import { registerInstallRoutes } from "./install/routes.js";
import { registerInstallGuards } from "./guards.js";
import { registerPlatformRoutes } from "./platform/routes.js";
import { registerTenantRoutes } from "./tenant/routes.js";
import { refreshRuntimePoolFromInfra } from "./install/state.js";

export async function buildServer() {
  await refreshRuntimePoolFromInfra();

  const app = Fastify({
    logger: false,
    bodyLimit: 64 * 1024,
  });

  await registerHealthRoutes(app);
  await registerInstallRoutes(app);
  await registerAuthRoutes(app);
  await registerPlatformRoutes(app);
  await registerTenantRoutes(app);
  await registerInstallGuards(app);

  return app;
}
