/** S0.8 tenant kernel health API (WMS-110 / K12). */
import type { HealthMigrations, HealthQueues, HealthStatus } from "./health.js";
import type { TelemetryAggregatePoint, TelemetryExportPayload } from "./telemetry.js";

export const TENANT_KERNEL_HTTP = {
  status: "/api/v1/tenant/kernel-status",
} as const;

export const TELEMETRY_OTLP_PLAIN_KEY = "telemetry.otlp.endpoint" as const;

export interface TenantOutboxKernelSummary {
  pending: number;
  dlq: number;
  backlogDegraded: boolean;
}

export interface TenantOtlpHookStatus {
  configured: boolean;
  source: "env" | "tenant" | "none";
  /** Hostname only — never full URL with secrets. */
  endpointHost: string | null;
}

export interface TenantKernelStatusResponse {
  contract: "k12-kernel.v1";
  health: {
    contract: string;
    status: HealthStatus;
    migrations: HealthMigrations;
    queues: HealthQueues;
  };
  outbox: TenantOutboxKernelSummary;
  aggregates: TelemetryAggregatePoint[];
  otlp: TenantOtlpHookStatus;
  exportPreview: TelemetryExportPayload;
}

export function tenantKernelAppPath(tenantId: string): string {
  return `/app/t/${tenantId}/kernel`;
}

export function k12KernelTitle(): string {
  return "Telemetria e saúde do kernel (K12)";
}

export function k12KernelLead(): string {
  return "Status agregado do tenant: migrations, fila de e-mail (K14) e contadores técnicos sem identificadores de lote ou cliente (H-3).";
}

export function k12KernelLoadErrorMessage(): string {
  return "Não foi possível carregar o status do kernel. Tente novamente.";
}

export function k12OutboxDegradedHint(): string {
  return "Fila e-mail atrasada — verifique SMTP (K9) ou DLQ (K14).";
}

export function k12OtlpHookLabel(): string {
  return "Gancho OTLP (config-only)";
}

export function isTenantKernelStatusResponse(
  value: unknown,
): value is TenantKernelStatusResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const v = value as TenantKernelStatusResponse;
  return v.contract === "k12-kernel.v1" && typeof v.health?.status === "string";
}
