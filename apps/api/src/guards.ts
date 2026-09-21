import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AUTH_HTTP,
  AUTH_ERROR_SESSION_REQUIRED,
  INSTALL_ERROR_NOT_AVAILABLE,
  SESSION_COOKIE_NAME,
  authError,
  installK4Error,
} from "@liowms/shared";
import type { RequestAuthContext } from "./auth/context.js";
import { resolveSession } from "./auth/service.js";
import { resolveInstallState } from "./install/state.js";

const INSTALL_PREFIX = "/api/v1/install";
const HEALTH_PATH = "/health";

const AUTH_PUBLIC_PATHS = new Set<string>([
  AUTH_HTTP.login,
  AUTH_HTTP.passwordResetRequest,
  AUTH_HTTP.passwordResetConfirm,
  AUTH_HTTP.invitesAccept,
]);

function requestPath(req: FastifyRequest): string {
  return req.url.split("?")[0] ?? req.url;
}

function parseSessionCookie(req: FastifyRequest): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) {
    return undefined;
  }
  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE_NAME) {
      return rest.join("=");
    }
  }
  return undefined;
}

function parseBearer(req: FastifyRequest): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return undefined;
  }
  return header.slice("Bearer ".length).trim();
}

export function getRequestAuth(req: FastifyRequest): RequestAuthContext | null {
  return (req as FastifyRequest & { auth?: RequestAuthContext }).auth ?? null;
}

function requiresSession(path: string): boolean {
  if (path === HEALTH_PATH || path.startsWith(INSTALL_PREFIX)) {
    return false;
  }
  if (path.startsWith("/api/v1/auth")) {
    return !AUTH_PUBLIC_PATHS.has(path);
  }
  return path.startsWith("/api/v1/");
}

export async function registerInstallGuards(app: FastifyInstance) {
  app.decorateRequest("auth", null);

  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    const path = requestPath(req);
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

    const session = await resolveSession(
      parseSessionCookie(req),
      parseBearer(req),
    );
    if (session) {
      (req as FastifyRequest & { auth: RequestAuthContext }).auth = session;
    }

    if (requiresSession(path) && !session) {
      return reply.status(401).send(
        authError(AUTH_ERROR_SESSION_REQUIRED, "Sessão obrigatória"),
      );
    }
  });
}
