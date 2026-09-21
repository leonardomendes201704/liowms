# TC-GOLD S0.5 — QA sign-off (WMS-99 / PAP-163)

| Field | Value |
|-------|--------|
| **Workspace** | LioWMS execution checkout (S0.5 audit + K10; unmerged) |
| **Staging** | https://pierce-playstation-mail-kay.trycloudflare.com (`docs/STAGING-S01.md`) |
| **Date** | 2026-09-21 UTC |
| **Executor** | QA agent (`issue_blockers_resolved` wake) |

## Results

| TC-GOLD | Plane | Result | Method |
|---------|-------|--------|--------|
| **J0d-01** | WMS-63 | **PASS** (workspace) | API writer smoke: `PATCH /api/v1/tenant/settings` → `GET /api/v1/tenant/audit-events` lists actor + redacted diff. Web K10: `wizard-k10.test.tsx` **2/2** (table + route). |
| **J0d-02** | WMS-65 | **PASS** | `audit-log.test.ts`: `PATCH`/`DELETE` on audit-events → **405**. |
| **H-03** | WMS-67 | **PASS** | `audit-log.test.ts`: direct `UPDATE audit.audit_events` rejected by append-only trigger. |
| **H-01** | WMS-64 | **PASS** (regression) | `config-store.test.ts` TC-GOLD H-01 hook: settings JSON never contains SMTP password. |

## Staging HTTPS (board smoke)

| Check | Result |
|-------|--------|
| `/health` migrations | **4 / `004_config_store`** — S0.5 `005_audit_log` **not deployed** on canonical staging slot |
| `GET /api/v1/tenant/audit-events` (no session) | **401** `AUTH_SESSION_REQUIRED` (route/auth stack; no authenticated J0d e2e) |
| K10 SPA shell `/app/t/{tenantId}/audit` | **200** (Vite shell only; bundle not verified for S0.5 UI) |

**Staging J0d-01/K10 end-to-end:** **NOT RUN** — blocked on Release deploying workspace S0.5 + migration 005 to `app_staging` (parent [PAP-159](/PAP/issues/PAP-159)). Workspace automated coverage is sufficient for TC-GOLD kernel sign-off pre-deploy.

## Commands (redacted)

```text
npm run test -w @liowms/shared  → 13/13
npm run test -w @liowms/web     → 13/13 (incl. K10)
LIOWMS_TEST_PG_ADMIN_DSN=<company admin, CREATEDB> npm run test -w @liowms/api → 15/15
curl staging /health            → installed:true, migrations 4/004_config_store
```

## Notes

- Prior blocker: integration tests required `LIOWMS_TEST_PG_ADMIN_DSN` (resolved via runner `apps/api/.env`).
- No secrets, DSNs, or SMTP passwords recorded in this artifact.
