import type { FastifyInstance } from "fastify";
import { buildHealthResponse } from "@liowms/shared";
import { API_VERSION } from "../version.js";
import { resolveInstallState } from "../install/state.js";
import { resolveGlobalOutboxQueueHealth } from "./queues.js";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async (_req, reply) => {
    const state = await resolveInstallState();
    const queues = await resolveGlobalOutboxQueueHealth(state.installed);
    const body = buildHealthResponse({
      installed: state.installed,
      phase: state.phase,
      version: API_VERSION,
      migrationsApplied: state.migrationsApplied,
      migrationsLatest: state.migrationsLatest,
      queuesReady: queues.ready,
      queuesDetail: queues.detail,
    });
    return reply.send(body);
  });
}
