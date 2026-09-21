import Fastify from "fastify";
import { registerHealthRoutes } from "./health/routes.js";
import { registerInstallRoutes } from "./install/routes.js";
import { registerInstallGuards } from "./guards.js";
import { refreshRuntimePoolFromInfra } from "./install/state.js";

export async function buildServer() {
  await refreshRuntimePoolFromInfra();

  const app = Fastify({
    logger: false,
    bodyLimit: 64 * 1024,
  });

  await registerHealthRoutes(app);
  await registerInstallRoutes(app);
  await registerInstallGuards(app);

  return app;
}
