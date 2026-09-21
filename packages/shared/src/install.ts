export const INSTALL_ERROR_ALREADY_DONE = "INSTALL_ALREADY_DONE" as const;
export const INSTALL_ERROR_INVALID_DSN = "INSTALL_INVALID_DSN" as const;
export const INSTALL_ERROR_MIGRATION_FAILED = "INSTALL_MIGRATION_FAILED" as const;
export const INSTALL_ERROR_NOT_AVAILABLE = "INSTALL_NOT_AVAILABLE" as const;

/** K4-aligned error envelope for install guard failures. */
export interface InstallErrorBody {
  code: string;
  message: string;
  screen: "K4";
}

export function installK4Error(
  code: string,
  message: string,
): InstallErrorBody {
  return { code, message, screen: "K4" };
}

/** REST paths implemented by `@liowms/api` (WMS-87). */
export const INSTALL_HTTP = {
  testDsn: "/api/v1/install/dsn/test",
  complete: "/api/v1/install/complete",
} as const;
