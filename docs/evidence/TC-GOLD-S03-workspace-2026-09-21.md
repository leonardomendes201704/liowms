# TC-GOLD S0.3 — workspace evidence (WMS-93 / PAP-150)

| Field | Value |
|-------|--------|
| **Commit** | `9ef39e3` (`main` workspace) |
| **Executor** | QA agent heartbeat |
| **Date** | 2026-09-21 UTC |
| **Environment** | Company runner — local Postgres + Node 20 integration/unit tests |
| **Staging HTTPS** | **NOT RUN** — tunnel down (`530` on prior hostname); Release track PAP-151 owns restage after `origin/main` push |

## Scope (READY-1 / WMS-26)

| TC-GOLD | Plane | Result | Method |
|---------|-------|--------|--------|
| **J0b-01** | WMS-58 | **PASS** (workspace) | `@liowms/api` `tenant-rls.test.ts`: super-admin install → `POST /api/v1/platform/tenants` (Tenant B) → plant under B → tenant_admin membership |
| **J12-01** | WMS-59 | **PASS** | Same suite: `TC-GOLD J12-01` cross-tenant GET/PATCH → `403` + `AUTH_FORBIDDEN`; own-tenant GET `200` |
| **J12-02** | WMS-60 | **PASS** | `@liowms/web` `wizard-s03.test.ts` + `@liowms/shared` W16 copy / `userCanAccessTenant` denies foreign tenant |
| **J12-03** | WMS-61 | **NOT RUN** | Deferred to slice S0.8 per planning S0.3 DoD |

## Commands (redacted)

```text
git rev-parse HEAD  → 9ef39e373e047b7429c454d440f58f7fd748c841
npm run test -w @liowms/web     → 7/7 pass
npm run test -w @liowms/shared  → 6/6 pass
LIOWMS_TEST_PG_ADMIN_DSN=<company postgres admin> npm run test -w @liowms/api → 11/11 pass
```

Full API log: run scratch `api-test.log` (this heartbeat).

## Notes

- Remote `origin/main` still at `e738955` at time of run; staging URL in `docs/STAGING-S01.md` not updated for S0.3 until Release push + restage.
- Post-push: re-run J0b/J12 on staging HTTPS and append a sibling evidence file.
