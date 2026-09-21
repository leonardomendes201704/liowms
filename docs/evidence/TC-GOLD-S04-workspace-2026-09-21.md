# TC-GOLD S0.4 — workspace evidence (WMS-96 / PAP-156)

| Field | Value |
|-------|--------|
| **Commit (origin/main)** | `2a91ece` (GitHub — **S0.4 not pushed yet**) |
| **Workspace** | WMS-94/95 integrated locally (PAP-154/155 **done** in Paperclip) |
| **Executor** | QA agent heartbeat |
| **Date** | 2026-09-21 UTC (resume after blocker wake) |
| **Staging HTTPS** | `docs/STAGING-S01.md` — health 200; migrations **003** only (no S0.4 deploy) |

## Scope (WMS-27 / planning-s0.4)

| TC-GOLD | Plane | Result | Method / notes |
|---------|-------|--------|----------------|
| **H-01** | WMS-64 | **PARTIAL PASS** | **Git:** 0 tracked `.env`. **Settings export:** `config-store.test.ts` in workspace — **not executed** (`app_staging` lacks `CREATEDB`; need `postgres.admin` DSN or Release-run suite). |
| **J0c-01** | WMS-69 | **PARTIAL PASS** | **Unit:** `@liowms/web` 11/11 (incl. `wizard-k9.test.ts`); `@liowms/shared` 8/8; `npm run build` green. **API envelope + outbox:** pending integration test. **Staging K9:** blocked until [PAP-157](/PAP/issues/PAP-157) push/restage. |
| **J0d-01** | WMS-63 | **NOT RUN** | Accepted deferral — audit pleno **S0.5** (planning-s0.4). |

## Commands (redacted)

```text
git rev-parse HEAD  → 2a91ece (origin/main unchanged)
npm run test -w @liowms/web     → 11/11 pass
npm run test -w @liowms/shared  → 8/8 pass
npm run build                   → pass
npm run test -w @liowms/api     → FAIL setup (permission denied CREATE DATABASE)
GET /health (staging)           → installed true, migrations applied 3 / latest 003_tenant_rls
```

## Blockers (next)

1. [PAP-157](/PAP/issues/PAP-157) — push `main` + restage HTTPS (migration 004 + K9).
2. **Infra:** `LIOWMS_TEST_PG_ADMIN_DSN` with `CREATEDB` for `@liowms/api` (incl. `config-store.test.ts`).

## Remaining for **done**

- API integration green on admin PG.
- Staging smoke: tenant settings GET/PATCH + K9 page on canonical URL.
