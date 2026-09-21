import type { BootstrapRole, AuthUserProfile } from "@liowms/shared";

export interface RequestAuthContext {
  user: AuthUserProfile;
  sessionId: string;
  /** JWT `tid` or validated `x-lio-tenant-id` header. */
  activeTenantId?: string;
}

export function hasBootstrapRole(
  user: AuthUserProfile,
  role: BootstrapRole,
): boolean {
  return user.roles.includes(role);
}

export function canInviteUsers(user: AuthUserProfile): boolean {
  return hasBootstrapRole(user, "super_admin") ||
    hasBootstrapRole(user, "tenant_admin");
}
