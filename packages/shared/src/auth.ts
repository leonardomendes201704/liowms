/** Bootstrap RBAC roles (S0.2 / WMS-89). */
export type BootstrapRole = "super_admin" | "tenant_admin" | "operator";

export const AUTH_ERROR_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS" as const;
export const AUTH_ERROR_SESSION_REQUIRED = "AUTH_SESSION_REQUIRED" as const;
export const AUTH_ERROR_FORBIDDEN = "AUTH_FORBIDDEN" as const;
export const AUTH_ERROR_INVALID_TOKEN = "AUTH_INVALID_TOKEN" as const;
export const AUTH_ERROR_NOT_INSTALLED = "AUTH_NOT_INSTALLED" as const;

export interface AuthErrorBody {
  code: string;
  message: string;
}

export function authError(code: string, message: string): AuthErrorBody {
  return { code, message };
}

export const SESSION_COOKIE_NAME = "lio_session" as const;

/** REST paths implemented by `@liowms/api` (WMS-89). */
export const AUTH_HTTP = {
  login: "/api/v1/auth/login",
  logout: "/api/v1/auth/logout",
  me: "/api/v1/auth/me",
  passwordResetRequest: "/api/v1/auth/password-reset/request",
  passwordResetConfirm: "/api/v1/auth/password-reset/confirm",
  invites: "/api/v1/auth/invites",
  invitesAccept: "/api/v1/auth/invites/accept",
} as const;

export interface AuthUserProfile {
  id: string;
  email: string;
  displayName: string;
  roles: BootstrapRole[];
  tenantIds: string[];
}

export interface AuthLoginSuccess {
  ok: true;
  user: AuthUserProfile;
  token: string;
}

export interface AuthMeResponse {
  user: AuthUserProfile;
}

/** K5 UI variants for login surfaces (WMS-90). */
export type K5Variant =
  | "invalid_credentials"
  | "session_expired"
  | "not_installed";

export function authCodeToK5(code: string): K5Variant | null {
  switch (code) {
    case AUTH_ERROR_INVALID_CREDENTIALS:
      return "invalid_credentials";
    case AUTH_ERROR_SESSION_REQUIRED:
      return "session_expired";
    case AUTH_ERROR_NOT_INSTALLED:
      return "not_installed";
    default:
      return null;
  }
}

export function k5Title(variant: K5Variant): string {
  switch (variant) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos";
    case "session_expired":
      return "Sessão expirada";
    case "not_installed":
      return "Instância não instalada";
  }
}

export function k5Message(variant: K5Variant): string {
  switch (variant) {
    case "invalid_credentials":
      return "Verifique suas credenciais e tente novamente. Após várias tentativas, aguarde alguns minutos.";
    case "session_expired":
      return "Por segurança, faça login novamente para continuar.";
    case "not_installed":
      return "Conclua o assistente de instalação antes de acessar o login.";
  }
}
