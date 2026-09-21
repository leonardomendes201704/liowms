import type { FastifyInstance } from "fastify";
import { buildHealthResponse } from "@liowms/shared";
import { API_VERSION } from "../version.js";
import { resolveInstallState } from "../install/state.js";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async (_req, reply) => {
    const state = await resolveInstallState();
    const body = buildHealthResponse({
      installed: state.installed,
      phase: state.phase,
      version: API_VERSION,
      migrationsApplied: state.migrationsApplied,
      migrationsLatest: state.migrationsLatest,
      queuesReady: state.installed,
      queuesDetail: state.installed ? "outbox:worker" : "n/a",
    });
    return reply.send(body);
  });
}
