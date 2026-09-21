/** S0.8 aggregated telemetry export (H-3 / J12-03) — counts only, no cross-tenant PII. */

export interface TelemetryAggregatePoint {
  metricKey: string;
  count: number;
}

export interface TelemetryExportPayload {
  aggregates: TelemetryAggregatePoint[];
}

const FORBIDDEN_SUBSTRINGS = [
  "email",
  "client",
  "customer",
  "lote",
  "lot",
  "batch",
  "tenant",
  "password",
  "token",
  "smtp",
  "invite",
] as const;

/** Keys that must never appear in OTLP/export payloads (ADR-004 / H-3). */
export function telemetryExportKeyAllowed(metricKey: string): boolean {
  const lower = metricKey.toLowerCase();
  return !FORBIDDEN_SUBSTRINGS.some((frag) => lower.includes(frag));
}

export function buildTelemetryExportPayload(
  points: TelemetryAggregatePoint[],
): TelemetryExportPayload {
  const aggregates = points.filter((p) => telemetryExportKeyAllowed(p.metricKey));
  return { aggregates };
}

export function assertTelemetryExportSafe(payload: TelemetryExportPayload): void {
  for (const point of payload.aggregates) {
    if (!telemetryExportKeyAllowed(point.metricKey)) {
      throw new Error(`telemetry_export_forbidden_key:${point.metricKey}`);
    }
    if (!Number.isFinite(point.count) || point.count < 0) {
      throw new Error("telemetry_export_invalid_count");
    }
  }
  const serialized = JSON.stringify(payload);
  for (const frag of FORBIDDEN_SUBSTRINGS) {
    if (serialized.toLowerCase().includes(`"${frag}`)) {
      throw new Error(`telemetry_export_forbidden_field:${frag}`);
    }
  }
}
