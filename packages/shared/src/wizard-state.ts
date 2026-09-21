import {
  INSTALL_ERROR_ALREADY_DONE,
  INSTALL_ERROR_INVALID_DSN,
  INSTALL_ERROR_MIGRATION_FAILED,
} from "./install.js";

export type WizardStep = 1 | 2 | 3;

export type K4Variant = "db_refused" | "migration_failed" | "already_installed";

export function installCodeToK4(code: string): K4Variant | null {
  switch (code) {
    case INSTALL_ERROR_INVALID_DSN:
      return "db_refused";
    case INSTALL_ERROR_MIGRATION_FAILED:
      return "migration_failed";
    case INSTALL_ERROR_ALREADY_DONE:
      return "already_installed";
    default:
      return null;
  }
}

export function k4Title(variant: K4Variant): string {
  switch (variant) {
    case "db_refused":
      return "Não foi possível conectar ao PostgreSQL";
    case "migration_failed":
      return "Falha ao executar migrations";
    case "already_installed":
      return "Esta instância já está instalada";
  }
}
