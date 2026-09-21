import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AUTH_ERROR_SESSION_REQUIRED,
  AUTH_HTTP,
  SESSION_COOKIE_NAME,
  authError,
} from "@liowms/shared";
import { getRequestAuth } from "../guards.js";
import { canInviteUsers } from "./context.js";
import {
  acceptInvite,
  confirmPasswordReset,
  createInvite,
  loginWithPassword,
  logoutSession,
  requestPasswordReset,
} from "./service.js";
import { SESSION_TTL_SECONDS } from "./jwt.js";

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

function setSessionCookie(reply: FastifyReply, token: string): void {
  const maxAge = SESSION_TTL_SECONDS;
  reply.header(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  );
}

function clearSessionCookie(reply: FastifyReply): void {
  reply.header(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post(AUTH_HTTP.login, async (req, reply) => {
    const body = req.body as {
      email?: string;
      password?: string;
      tenantId?: string;
    };
    if (!body?.email || !body?.password) {
      return reply.status(400).send({ message: "email e password obrigatórios" });
    }
    const result = await loginWithPassword(
      body.email,
      body.password,
      body.tenantId,
    );
    if (!result.ok) {
      const status = result.code === "AUTH_FORBIDDEN" ? 403 : 401;
      return reply.status(status).send(authError(result.code, result.message));
    }
    setSessionCookie(reply, result.sessionToken);
    return reply.send({
      ok: true,
      token: result.jwt,
      user: result.user,
    });
  });

  app.post(AUTH_HTTP.logout, async (req, reply) => {
    await logoutSession(parseSessionCookie(req));
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.get(AUTH_HTTP.me, async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!auth) {
      return reply.status(401).send(
        authError(AUTH_ERROR_SESSION_REQUIRED, "Sessão obrigatória"),
      );
    }
    return reply.send({ user: auth.user });
  });

  app.post(AUTH_HTTP.passwordResetRequest, async (req, reply) => {
    const body = req.body as { email?: string };
    if (!body?.email) {
      return reply.status(400).send({ message: "email obrigatório" });
    }
    await requestPasswordReset(body.email);
    return reply.send({ ok: true });
  });

  app.post(AUTH_HTTP.passwordResetConfirm, async (req, reply) => {
    const body = req.body as { token?: string; password?: string };
    if (!body?.token || !body?.password) {
      return reply.status(400).send({ message: "token e password obrigatórios" });
    }
    const result = await confirmPasswordReset(body.token, body.password);
    if (!result.ok) {
      return reply.status(422).send(authError(result.code, result.message));
    }
    return reply.send({ ok: true });
  });

  app.post(AUTH_HTTP.invites, async (req, reply) => {
    const auth = getRequestAuth(req);
    if (!auth || !canInviteUsers(auth.user)) {
      return reply.status(403).send(
        authError("AUTH_FORBIDDEN", "Sem permissão para convidar"),
      );
    }
    const body = req.body as {
      email?: string;
      tenantId?: string;
      role?: "tenant_admin" | "operator";
    };
    if (!body?.email || !body?.tenantId || !body?.role) {
      return reply.status(400).send({ message: "payload incompleto" });
    }
    const tenantId =
      auth.activeTenantId && !auth.user.roles.includes("super_admin")
        ? auth.activeTenantId
        : body.tenantId;
    if (
      auth.activeTenantId &&
      body.tenantId &&
      body.tenantId !== auth.activeTenantId &&
      !auth.user.roles.includes("super_admin")
    ) {
      return reply.status(403).send(
        authError("AUTH_FORBIDDEN", "Convite fora do tenant ativo"),
      );
    }
    const result = await createInvite({
      email: body.email,
      tenantId: tenantId!,
      role: body.role,
      invitedBy: auth.user,
    });
    if (!result.ok) {
      const status = result.code === "AUTH_FORBIDDEN" ? 403 : 422;
      return reply.status(status).send(authError(result.code, result.message));
    }
    return reply.send({ ok: true, inviteId: result.inviteId });
  });

  app.post(AUTH_HTTP.invitesAccept, async (req, reply) => {
    const body = req.body as {
      token?: string;
      password?: string;
      displayName?: string;
    };
    if (!body?.token || !body?.password || !body?.displayName) {
      return reply.status(400).send({ message: "payload incompleto" });
    }
    const result = await acceptInvite({
      token: body.token,
      password: body.password,
      displayName: body.displayName,
    });
    if (!result.ok) {
      return reply.status(422).send(authError(result.code, result.message));
    }
    return reply.send({ ok: true, userId: result.userId });
  });
}
