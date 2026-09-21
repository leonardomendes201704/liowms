import type { InstallPhase } from "@liowms/shared";
import {
  countAppliedMigrations,
  LATEST_MIGRATION,
} from "./migrations/index.js";
import {
  createPool,
  getRuntimePool,
  readInstallMeta,
  setRuntimePool,
} from "../db/pool.js";

export interface InstallRuntimeState {
  phase: InstallPhase;
  installed: boolean;
  migrationsApplied: number | null;
  migrationsLatest: string | null;
}

let installing = false;

export function markInstalling(active: boolean): void {
  installing = active;
}

export function isInstalling(): boolean {
  return installing;
}

/** Infra DSN injected by Release (not business .env in repo). */
export function infraDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL?.trim() || undefined;
}

export async function refreshRuntimePoolFromInfra(): Promise<void> {
  const dsn = infraDatabaseUrl();
  if (!dsn) {
    setRuntimePool(null);
    return;
  }
  const pool = createPool(dsn);
  setRuntimePool(pool);
}

export async function resolveInstallState(): Promise<InstallRuntimeState> {
  if (installing) {
    return {
      phase: "installing",
      installed: false,
      migrationsApplied: null,
      migrationsLatest: LATEST_MIGRATION,
    };
  }

  const pool = getRuntimePool();
  if (!pool) {
    return {
      phase: "uninstalled",
      installed: false,
      migrationsApplied: null,
      migrationsLatest: LATEST_MIGRATION,
    };
  }

  try {
    const meta = await readInstallMeta(pool);
    if (!meta?.install_lock) {
      const applied = await countAppliedMigrations(pool);
      if (applied === 0) {
        return {
          phase: "uninstalled",
          installed: false,
          migrationsApplied: 0,
          migrationsLatest: LATEST_MIGRATION,
        };
      }
      return {
        phase: "uninstalled",
        installed: false,
        migrationsApplied: applied,
        migrationsLatest: LATEST_MIGRATION,
      };
    }

    const applied = await countAppliedMigrations(pool);
    return {
      phase: "installed",
      installed: true,
      migrationsApplied: applied,
      migrationsLatest: LATEST_MIGRATION,
    };
  } catch {
    return {
      phase: "uninstalled",
      installed: false,
      migrationsApplied: null,
      migrationsLatest: LATEST_MIGRATION,
    };
  }
}
