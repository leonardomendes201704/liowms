/** H-4 health JSON contract (S0.1 / S0.8). */
export const HEALTH_CONTRACT = "h-4.v1" as const;

export type InstallPhase = "uninstalled" | "installing" | "installed";

export type HealthStatus =
  | "uninstalled"
  | "installing"
  | "ok"
  | "degraded";

export interface HealthMigrations {
  applied: number | null;
  latest: string | null;
}

export interface HealthQueues {
  ready: boolean;
  detail: string;
}

export interface HealthResponseH4 {
  contract: typeof HEALTH_CONTRACT;
  installed: boolean;
  phase: InstallPhase;
  status: HealthStatus;
  service: "liowms-api";
  version: string;
  migrations: HealthMigrations;
  queues: HealthQueues;
}

export function buildHealthResponse(input: {
  installed: boolean;
  phase: InstallPhase;
  version: string;
  migrationsApplied: number | null;
  migrationsLatest: string | null;
  queuesReady: boolean;
  queuesDetail: string;
}): HealthResponseH4 {
  const status: HealthStatus =
    input.phase === "uninstalled"
      ? "uninstalled"
      : input.phase === "installing"
        ? "installing"
        : input.queuesReady
          ? "ok"
          : "degraded";

  return {
    contract: HEALTH_CONTRACT,
    installed: input.installed,
    phase: input.phase,
    status,
    service: "liowms-api",
    version: input.version,
    migrations: {
      applied: input.migrationsApplied,
      latest: input.migrationsLatest,
    },
    queues: {
      ready: input.queuesReady,
      detail: input.queuesDetail,
    },
  };
}
