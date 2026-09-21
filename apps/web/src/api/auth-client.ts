import {
  AUTH_HTTP,
  type AuthErrorBody,
  type AuthLoginSuccess,
  type AuthMeResponse,
  type AuthUserProfile,
} from "@liowms/shared";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error("Resposta vazia do servidor");
  }
  return JSON.parse(text) as T;
}

const jsonOpts: RequestInit = {
  credentials: "include",
  headers: { "Content-Type": "application/json" },
};

export async function login(
  email: string,
  password: string,
): Promise<AuthLoginSuccess | AuthErrorBody> {
  const res = await fetch(AUTH_HTTP.login, {
    ...jsonOpts,
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (res.ok) {
    return readJson<AuthLoginSuccess>(res);
  }
  return readJson<AuthErrorBody>(res);
}

export async function logout(): Promise<void> {
  await fetch(AUTH_HTTP.logout, { method: "POST", credentials: "include" });
}

export interface AuthMeResult {
  user: AuthUserProfile;
}

export async function fetchMe(): Promise<
  AuthMeResult | AuthErrorBody | { unauthorized: true }
> {
  const res = await fetch(AUTH_HTTP.me, { credentials: "include" });
  if (res.status === 401) {
    return { unauthorized: true };
  }
  if (res.ok) {
    return readJson<AuthMeResponse>(res);
  }
  return readJson<AuthErrorBody>(res);
}

export async function requestPasswordReset(
  email: string,
): Promise<{ ok: true } | AuthErrorBody> {
  const res = await fetch(AUTH_HTTP.passwordResetRequest, {
    ...jsonOpts,
    method: "POST",
    body: JSON.stringify({ email }),
  });
  if (res.ok) {
    return { ok: true };
  }
  return readJson<AuthErrorBody>(res);
}

export async function confirmPasswordReset(
  token: string,
  password: string,
): Promise<{ ok: true } | AuthErrorBody> {
  const res = await fetch(AUTH_HTTP.passwordResetConfirm, {
    ...jsonOpts,
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
  if (res.ok) {
    return { ok: true };
  }
  return readJson<AuthErrorBody>(res);
}

export async function createInvite(input: {
  email: string;
  tenantId: string;
  role: "tenant_admin" | "operator";
}): Promise<{ ok: true; inviteId: string } | AuthErrorBody> {
  const res = await fetch(AUTH_HTTP.invites, {
    ...jsonOpts,
    method: "POST",
    body: JSON.stringify(input),
  });
  return readJson(res);
}

export async function acceptInvite(input: {
  token: string;
  password: string;
  displayName: string;
}): Promise<{ ok: true; userId: string } | AuthErrorBody> {
  const res = await fetch(AUTH_HTTP.invitesAccept, {
    ...jsonOpts,
    method: "POST",
    body: JSON.stringify(input),
  });
  return readJson(res);
}
