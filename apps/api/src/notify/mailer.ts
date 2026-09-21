import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { TenantSmtpConfig } from "./service.js";

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderOutboxEmail(input: {
  kind: string;
  payload: Record<string, unknown>;
  appBaseUrl: string;
}): RenderedEmail | null {
  const to = String(input.payload.to ?? input.payload.email ?? "").trim();
  if (!to) {
    return null;
  }

  if (input.kind === "password_reset") {
    const token = String(input.payload.resetToken ?? "");
    const link = `${input.appBaseUrl}/login/reset?token=${encodeURIComponent(token)}`;
    return {
      subject: "Redefinição de senha — LioWMS",
      text: `Use o link para redefinir sua senha (válido por 24h):\n${link}`,
      html: `<p>Use o link para redefinir sua senha (válido por 24h):</p><p><a href="${link}">Redefinir senha</a></p>`,
    };
  }

  if (input.kind === "user_invite") {
    const token = String(input.payload.inviteToken ?? "");
    const link = `${input.appBaseUrl}/invite/accept?token=${encodeURIComponent(token)}`;
    return {
      subject: "Convite LioWMS",
      text: `Você foi convidado. Aceite em:\n${link}`,
      html: `<p>Você foi convidado ao LioWMS.</p><p><a href="${link}">Aceitar convite</a></p>`,
    };
  }

  return null;
}

export function createSmtpTransport(
  config: TenantSmtpConfig,
): Transporter {
  if (process.env.LIOWMS_SMTP_JSON_TRANSPORT === "1") {
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: config.user
      ? { user: config.user, pass: config.password }
      : undefined,
  });
}

export async function sendRenderedEmail(input: {
  transport: Transporter;
  from: string;
  to: string;
  rendered: RenderedEmail;
}): Promise<void> {
  await input.transport.sendMail({
    from: input.from,
    to: input.to,
    subject: input.rendered.subject,
    text: input.rendered.text,
    html: input.rendered.html,
  });
}
