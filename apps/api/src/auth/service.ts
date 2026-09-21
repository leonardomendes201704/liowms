import type { BootstrapRole, AuthUserProfile } from "@liowms/shared";
import {
  AUTH_ERROR_FORBIDDEN,
  AUTH_ERROR_INVALID_CREDENTIALS,
  AUTH_ERROR_INVALID_TOKEN,
} from "@liowms/shared";
import { getRuntimePool, readInstallMeta } from "../db/pool.js";
import { safeLog } from "../logging.js";
import { enqueueNotifyOutbox, resolveTenantIdForUser } from "../notify/service.js";
import { signSessionJwt, SESSION_TTL_SECONDS, verifySessionJwt } from "./jwt.js";
import { verifyPassword, hashPassword } from "./password.js";
import { hashToken, newOpaqueToken } from "./tokens.js";

const RESET_TTL_HOURS = 24;
const INVITE_TTL_DAYS = 7;

interface DbUser {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  is_super_admin: boolean;
}

async function loadUserProfile(userId: string): Promise<AuthUserProfile | null> {
  const pool = getRuntimePool();
  if (!pool) {
    return null;
  }
  const userRes = await pool.query<DbUser>(
    `SELECT id, email, display_name, password_hash, is_super_admin
     FROM platform_users WHERE id = $1`,
    [userId],
  );
  const row = userRes.rows[0];
  if (!row) {
    return null;
  }

  const memberships = await pool.query<{ tenant_id: string; role: string }>(
    `SELECT tenant_id, role FROM tenant_memberships WHERE user_id = $1`,
    [userId],
  );

  const roles: BootstrapRole[] = [];
  if (row.is_super_admin) {
    roles.push("super_admin");
  }
  for (const m of memberships.rows) {
    if (m.role === "tenant_admin" && !roles.includes("tenant_admin")) {
      roles.push("tenant_admin");
    }
    if (m.role === "operator" && !roles.includes("operator")) {
      roles.push("operator");
    }
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    roles,
    tenantIds: memberships.rows.map((m) => m.tenant_id),
  };
}

async function enqueueOutbox(
  kind: string,
  payload: Record<string, unknown>,
  tenantId: string | null,
): Promise<void> {
  await enqueueNotifyOutbox({ kind, payload, tenantId });
  safeLog("info", "outbox_enqueue", { kind, to: payload.to ?? payload.email });
}

export async function loginWithPassword(
  email: string,
  password: string,
  activeTenantId?: string,
): Promise<
  | { ok: true; sessionToken: string; jwt: string; user: AuthUserProfile }
  | { ok: false; code: string; message: string }
> {
  const pool = getRuntimePool();
  if (!pool) {
    return {
      ok: false,
      code: AUTH_ERROR_INVALID_CREDENTIALS,
      message: "Credenciais inválidas",
    };
  }

  const res = await pool.query<DbUser>(
    `SELECT id, email, display_name, password_hash, is_super_admin
     FROM platform_users WHERE lower(email) = lower($1)`,
    [email.trim()],
  );
  const user = res.rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    safeLog("info", "auth_login_failed", { email: email.trim() });
    return {
      ok: false,
      code: AUTH_ERROR_INVALID_CREDENTIALS,
      message: "Credenciais inválidas",
    };
  }

  const sessionToken = newOpaqueToken();
  const tokenHash = hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await pool.query(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt],
  );

  const profile = await loadUserProfile(user.id);
  if (!profile) {
    return {
      ok: false,
      code: AUTH_ERROR_INVALID_CREDENTIALS,
      message: "Credenciais inválidas",
    };
  }

  let jwtTenantId: string | undefined;
  if (activeTenantId?.trim()) {
    const tid = activeTenantId.trim();
    const allowed =
      profile.roles.includes("super_admin") || profile.tenantIds.includes(tid);
    if (!allowed) {
      return {
        ok: false,
        code: AUTH_ERROR_FORBIDDEN,
        message: "Tenant não permitido para este usuário",
      };
    }
    jwtTenantId = tid;
  }

  const meta = await readInstallMeta(pool);
  const jwt = meta
    ? signSessionJwt(user.id, meta.server_secret, jwtTenantId)
    : sessionToken;

  safeLog("info", "auth_login_ok", { userId: user.id });
  return { ok: true, sessionToken, jwt, user: profile };
}

export async function resolveSession(
  sessionToken: string | undefined,
  bearerJwt: string | undefined,
): Promise<{
  sessionId: string;
  user: AuthUserProfile;
  activeTenantId?: string;
} | null> {
  const pool = getRuntimePool();
  if (!pool) {
    return null;
  }

  if (sessionToken) {
    const tokenHash = hashToken(sessionToken);
    const res = await pool.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM user_sessions
       WHERE token_hash = $1 AND expires_at > now()`,
      [tokenHash],
    );
    const row = res.rows[0];
    if (row) {
      const user = await loadUserProfile(row.user_id);
      if (user) {
        return { sessionId: row.id, user };
      }
    }
  }

  if (bearerJwt) {
    const meta = await readInstallMeta(pool);
    if (!meta) {
      return null;
    }
    const claims = verifySessionJwt(bearerJwt, meta.server_secret);
    if (!claims) {
      return null;
    }
    const user = await loadUserProfile(claims.userId);
    if (user) {
      let activeTenantId = claims.tenantId;
      if (activeTenantId) {
        const allowed =
          user.roles.includes("super_admin") ||
          user.tenantIds.includes(activeTenantId);
        if (!allowed) {
          activeTenantId = undefined;
        }
      }
      return {
        sessionId: "jwt",
        user,
        activeTenantId,
      };
    }
  }

  return null;
}

export async function logoutSession(sessionToken: string | undefined): Promise<void> {
  if (!sessionToken) {
    return;
  }
  const pool = getRuntimePool();
  if (!pool) {
    return;
  }
  const tokenHash = hashToken(sessionToken);
  await pool.query(`DELETE FROM user_sessions WHERE token_hash = $1`, [tokenHash]);
}

export async function requestPasswordReset(
  email: string,
): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const pool = getRuntimePool();
  if (!pool) {
    return { ok: true };
  }

  const res = await pool.query<{ id: string }>(
    `SELECT id FROM platform_users WHERE lower(email) = lower($1)`,
    [email.trim()],
  );
  const user = res.rows[0];
  if (!user) {
    return { ok: true };
  }

  const token = newOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_HOURS * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt],
  );

  const client = await pool.connect();
  let tenantId: string | null = null;
  try {
    tenantId = await resolveTenantIdForUser(client, user.id);
  } finally {
    client.release();
  }

  await enqueueOutbox("password_reset", {
    to: email.trim(),
    userId: user.id,
    resetToken: token,
    expiresAt: expiresAt.toISOString(),
  }, tenantId);

  return { ok: true };
}

export async function confirmPasswordReset(
  token: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const pool = getRuntimePool();
  if (!pool) {
    return {
      ok: false,
      code: AUTH_ERROR_INVALID_TOKEN,
      message: "Token inválido ou expirado",
    };
  }

  const tokenHash = hashToken(token);
  const res = await pool.query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash],
  );
  const row = res.rows[0];
  if (!row) {
    return {
      ok: false,
      code: AUTH_ERROR_INVALID_TOKEN,
      message: "Token inválido ou expirado",
    };
  }

  const passwordHash = hashPassword(newPassword);
  await pool.query("BEGIN");
  try {
    await pool.query(
      `UPDATE platform_users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, row.user_id],
    );
    await pool.query(
      `UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
      [row.id],
    );
    await pool.query(`DELETE FROM user_sessions WHERE user_id = $1`, [
      row.user_id,
    ]);
    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }

  safeLog("info", "password_reset_confirmed", { userId: row.user_id });
  return { ok: true };
}

export async function createInvite(input: {
  email: string;
  tenantId: string;
  role: "tenant_admin" | "operator";
  invitedBy: AuthUserProfile;
}): Promise<
  | { ok: true; inviteId: string; acceptToken: string }
  | { ok: false; code: string; message: string }
> {
  if (!input.invitedBy.roles.includes("super_admin")) {
    const allowed = input.invitedBy.tenantIds.includes(input.tenantId);
    if (!allowed || !input.invitedBy.roles.includes("tenant_admin")) {
      return {
        ok: false,
        code: AUTH_ERROR_FORBIDDEN,
        message: "Sem permissão para convidar neste tenant",
      };
    }
  }

  const pool = getRuntimePool();
  if (!pool) {
    return {
      ok: false,
      code: AUTH_ERROR_FORBIDDEN,
      message: "Instância indisponível",
    };
  }

  const token = newOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const res = await pool.query<{ id: string }>(
    `INSERT INTO user_invites (tenant_id, email, role, token_hash, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      input.tenantId,
      input.email.trim().toLowerCase(),
      input.role,
      tokenHash,
      input.invitedBy.id,
      expiresAt,
    ],
  );

  await enqueueOutbox("user_invite", {
    to: input.email.trim(),
    tenantId: input.tenantId,
    role: input.role,
    inviteToken: token,
    expiresAt: expiresAt.toISOString(),
  }, input.tenantId);

  return { ok: true, inviteId: res.rows[0].id, acceptToken: token };
}

export async function acceptInvite(input: {
  token: string;
  password: string;
  displayName: string;
}): Promise<
  | { ok: true; userId: string }
  | { ok: false; code: string; message: string }
> {
  const pool = getRuntimePool();
  if (!pool) {
    return {
      ok: false,
      code: AUTH_ERROR_INVALID_TOKEN,
      message: "Convite inválido ou expirado",
    };
  }

  const tokenHash = hashToken(input.token);
  const res = await pool.query<{
    id: string;
    email: string;
    tenant_id: string;
    role: string;
  }>(
    `SELECT id, email, tenant_id, role FROM user_invites
     WHERE token_hash = $1 AND accepted_at IS NULL AND expires_at > now()`,
    [tokenHash],
  );
  const invite = res.rows[0];
  if (!invite) {
    return {
      ok: false,
      code: AUTH_ERROR_INVALID_TOKEN,
      message: "Convite inválido ou expirado",
    };
  }

  const passwordHash = hashPassword(input.password);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query<{ id: string }>(
      `SELECT id FROM platform_users WHERE lower(email) = lower($1)`,
      [invite.email],
    );

    let userId: string;
    if (existing.rows[0]) {
      userId = existing.rows[0].id;
      await client.query(
        `UPDATE platform_users SET password_hash = $1, display_name = $2 WHERE id = $3`,
        [passwordHash, input.displayName, userId],
      );
    } else {
      const created = await client.query<{ id: string }>(
        `INSERT INTO platform_users (email, display_name, password_hash, is_super_admin)
         VALUES ($1, $2, $3, false)
         RETURNING id`,
        [invite.email, input.displayName, passwordHash],
      );
      userId = created.rows[0].id;
    }

    await client.query(
      `INSERT INTO tenant_memberships (tenant_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [invite.tenant_id, userId, invite.role],
    );

    await client.query(
      `UPDATE user_invites SET accepted_at = now() WHERE id = $1`,
      [invite.id],
    );

    await client.query("COMMIT");
    safeLog("info", "invite_accepted", { userId, tenantId: invite.tenant_id });
    return { ok: true, userId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
