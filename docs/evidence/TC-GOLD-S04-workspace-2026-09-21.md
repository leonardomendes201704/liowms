# TC-GOLD S0.4 — workspace evidence (WMS-96 / PAP-156)

| Field | Value |
|-------|--------|
| **Workspace git** | Superseded — see [TC-GOLD-S04-signoff-2026-09-21.md](./TC-GOLD-S04-signoff-2026-09-21.md) (`origin/main` @ `a68e196`) |
| **Executor** | QA agent — CTO re-run wake `0c4f7a95` |
| **Date** | 2026-09-21 UTC |
| **Staging** | `docs/STAGING-S01.md` — **unstable** this heartbeat (`/health` 500; earlier 503 on auth when `installed:false` without pool DSN) |

## Scope results

| TC-GOLD | Plane | Result | Evidence |
|---------|-------|--------|----------|
| **H-01** | WMS-64 | **PARTIAL PASS** | Git: **0** tracked `.env`. **Settings export:** not executed in CI runner (`CREATEDB` denied on `app_staging`). Local API with `DATABASE_URL` → `installed:true`, migration **004** — login blocked (no known creds on shared `app_staging` users). |
| **J0c-01** | WMS-69 | **PARTIAL PASS** | **Unit:** `@liowms/web` **11/11** (incl. K9); `@liowms/shared` **8/8**. **HTTPS smoke:** **NOT COMPLETE** — staging API/auth unstable; fresh install via tunnel blocked (`INSTALL_ALREADY_DONE` vs `installed:false` split-brain). |
| **J0d-01** | WMS-63 | **NOT RUN** | S0.5 defer (unchanged). |

## Commands (redacted)

```text
git rev-parse HEAD → 5c9d817
npm run test -w @liowms/web    → 11/11
npm run test -w @liowms/shared → 8/8
npm run test -w @liowms/api    → FAIL (permission denied CREATE DATABASE)
curl staging /health         → 500 (end of heartbeat)
LOCAL API + DATABASE_URL     → health installed:true migrations 4/004_config_store
```

## Unblock for **done**

1. **Staging slot:** tunnel API must have `DATABASE_URL` to `app_staging` and consistent install state (`/health` `installed:true`, auth ≠ 503).
2. **QA integration:** `LIOWMS_TEST_PG_ADMIN_DSN` with `CREATEDB` **or** dedicated ephemeral DB per run.
3. **HTTPS J0c:** after (1), smoke `PATCH/GET /api/v1/tenant/settings` + K9 route on canonical URL.
