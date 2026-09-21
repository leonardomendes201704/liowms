import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { INSTALL_ERROR_NOT_AVAILABLE, installK4Error } from "@liowms/shared";
import { resolveInstallState } from "./install/state.js";

const INSTALL_PREFIX = "/api/v1/install";
const HEALTH_PATH = "/health";

export async function registerInstallGuards(app: FastifyInstance) {
  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    const path = req.url.split("?")[0] ?? req.url;
    if (path === HEALTH_PATH || path.startsWith(INSTALL_PREFIX)) {
      return;
    }

    const state = await resolveInstallState();
    if (!state.installed) {
      return reply.status(503).send(
        installK4Error(
          INSTALL_ERROR_NOT_AVAILABLE,
          "Sistema não instalado — use o wizard /install",
        ),
      );
    }
  });
}
