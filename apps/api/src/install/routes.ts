import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  INSTALL_ERROR_ALREADY_DONE,
  INSTALL_ERROR_NOT_AVAILABLE,
  installK4Error,
} from "@liowms/shared";
import { completeInstall, testInstallDsn } from "./service.js";
import { resolveInstallState } from "./state.js";

async function guardUninstalled(
  _req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const state = await resolveInstallState();
  if (state.installed) {
    await reply.status(404).send(
      installK4Error(
        INSTALL_ERROR_ALREADY_DONE,
        "Instância já instalada — wizard indisponível (K4)",
      ),
    );
    return;
  }
  if (state.phase === "installing") {
    await reply.status(409).send(
      installK4Error(
        INSTALL_ERROR_NOT_AVAILABLE,
        "Instalação em andamento — aguarde",
      ),
    );
  }
}

export async function registerInstallRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req, reply) => {
    if (!req.url.startsWith("/api/v1/install")) {
      return;
    }
    await guardUninstalled(req, reply);
  });

  app.post("/api/v1/install/dsn/test", async (req, reply) => {
    const body = req.body as { dsn?: string };
    if (!body?.dsn) {
      return reply.status(400).send({ message: "dsn obrigatório" });
    }
    const result = await testInstallDsn(body.dsn);
    if (!result.ok) {
      return reply.status(422).send(
        installK4Error(result.code, result.message),
      );
    }
    return reply.send({ ok: true });
  });

  app.post("/api/v1/install/complete", async (req, reply) => {
    const body = req.body as InstallCompleteBody;
    if (!body?.dsn || !body.admin?.email || !body.admin?.password) {
      return reply.status(400).send({ message: "payload incompleto" });
    }
    const result = await completeInstall({
      dsn: body.dsn,
      locale: body.locale ?? "pt-BR",
      timezone: body.timezone ?? "America/Sao_Paulo",
      instanceUrl: body.instanceUrl,
      admin: {
        email: body.admin.email,
        password: body.admin.password,
        displayName: body.admin.displayName ?? body.admin.email,
      },
      tenant: {
        slug: body.tenant?.slug ?? "root",
        name: body.tenant?.name ?? "Tenant raiz",
      },
    });
    if (!result.ok) {
      const status =
        result.code === INSTALL_ERROR_ALREADY_DONE ? 404 : 422;
      return reply.status(status).send(
        installK4Error(result.code, result.message),
      );
    }
    return reply.send({
      ok: true,
      installLock: true,
      redirect: result.redirect,
      tenantId: result.tenantId,
    });
  });
}

interface InstallCompleteBody {
  dsn?: string;
  locale?: string;
  timezone?: string;
  instanceUrl?: string;
  admin?: {
    email?: string;
    password?: string;
    displayName?: string;
  };
  tenant?: {
    slug?: string;
    name?: string;
  };
}
