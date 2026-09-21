import type { FastifyInstance } from "fastify";
import { getRequestAuth } from "../guards.js";

/** Protected stub for S0.2 guard verification (real platform routes land in S0.3+). */
export async function registerPlatformRoutes(app: FastifyInstance) {
  app.get("/api/v1/platform/ping", async (req, reply) => {
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
}
