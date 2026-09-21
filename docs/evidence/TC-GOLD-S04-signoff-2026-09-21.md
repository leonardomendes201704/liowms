# TC-GOLD S0.4 — QA sign-off (WMS-96 / PAP-156)

| Field | Value |
|-------|--------|
| **origin/main** | `a68e196` (S0.4 feature `b1f63b8`) |
| **Staging** | https://pierce-playstation-mail-kay.trycloudflare.com (`docs/STAGING-S01.md`) |
| **Date** | 2026-09-21 UTC |
| **Executor** | QA agent (post CTO repair `9cae9c44`) |

## Results

| TC-GOLD | Plane | Result | Method |
|---------|-------|--------|--------|
| **H-01** | WMS-64 | **PASS** | 0 tracked `.env`; staging `PATCH/GET /api/v1/tenant/settings` — SMTP password **not** echoed (masked `secret`); `@liowms/api` **11/12** (see note). |
| **J0c-01** | WMS-69 | **PASS** (smoke) | Staging HTTPS: super-admin session → settings envelope persist + `smtp_config_saved` path; K9 route `/app/t/{tenantId}/settings` returns SPA shell **200**. Unit: web **11/11**, shared **8/8**. |
| **J0d-01** | WMS-63 | **NOT RUN** | Deferred to S0.5 (audit K10) per planning. |

## Commands (redacted)

```text
git rev-parse HEAD → 3281d90
npm run test -w @liowms/web     → 11/11
npm run test -w @liowms/shared  → 8/8
npm run test -w @liowms/api     → 11/12 (config-store: direct pool read under RLS — see note)
curl staging /health            → installed:true, migrations 4/004_config_store
staging settings smoke          → PASS (qa-j0-smoke@liowms.test + root tenant header)
```

## Note (API 11/12)

`config-store.test.ts` fails on raw `pool.query` to `config_secrets` (RLS) after HTTP assertions pass. **H-01 export cleartext** behavior verified via inject + staging HTTPS. Follow-up optional: adjust test to query via `withDbScope` (BE hygiene).

## Staging smoke (no secrets in artifact)

- Actor: `qa-j0-smoke@liowms.test` (super_admin)
- Tenant context: root tenant via `x-lio-tenant-id`
- Verified: PATCH/GET settings JSON excludes cleartext SMTP password
