# TC-GOLD S0.8 — workspace verification (2026-09-21)

| Item | Result |
|------|--------|
| **Commit** | `08e2482` on `main` |
| **Migration** | `008_telemetry_s08` (`telemetry_counters` + RLS) |
| **H-02** | `GET /health` → `queues.detail` matches `outbox:worker=…;pending=…;dlq=…` |
| **J12-03** | `buildTelemetryExportPayload` + integration test tenant A/B isolation |
| **K12** | `TenantKernelHealthPage` + `GET /api/v1/tenant/kernel-status` |
| **OTLP** | `LIOWMS_OTLP_ENDPOINT` / `telemetry.otlp.endpoint` hook (no collector export) |

```bash
npm run build -w @liowms/shared && npm test -w @liowms/shared
npm run build -w @liowms/api && npm run build -w @liowms/web
LIOWMS_TEST_PG_ADMIN_DSN=… npm run test -w @liowms/api -- test/telemetry-kernel.test.ts
```
