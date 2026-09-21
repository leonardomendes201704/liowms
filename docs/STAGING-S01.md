# LioWMS S0.1 — staging HTTPS (board / TC-GOLD J0)

| Field | Value |
|-------|--------|
| **Base URL** | https://pierce-playstation-mail-kay.trycloudflare.com |
| **Wizard** | `/install` |
| **Health** | `/health` (expect `installed: false` after Release DB reset) |
| **Git** | https://github.com/leonardomendes201704/liowms @ `main` → `b0329f2` (S0.8 exec BE+FE — [PAP-173](/PAP/issues/PAP-173); QA [WMS-111](https://app.plane.so/paperclip-company/browse/WMS-111/) pending) |
| **K12** | `/app/t/{tenantId}/kernel` (telemetria read-only) |
| **Postgres slot** | `app_staging` (company Docker Postgres) |

## Ops notes (Release)

- Tunnel: Cloudflare quick tunnel (`cloudflared`) → local Vite `5173` (proxies `/api`, `/health`).
- **Vite host check:** `apps/web/vite.config.ts` allows `*.trycloudflare.com`. After changing that file or pulling `main`, **restart** `@liowms/web` dev or Board will see HTTP 403 (`server.allowedHosts`). Optional runner env: `LIOWMS_STAGING_PREVIEW=1` (allow all hosts) or `LIOWMS_VITE_ALLOWED_HOST=<hostname>` for a one-off tunnel domain.
- **Liveness:** URL is valid while `cloudflared`, `@liowms/api`, and `@liowms/web` dev processes are running on the company runner.
- **API DSN:** `@liowms/api` on `:3000` must have URL-encoded `DATABASE_URL` pointing at `app_staging` (gitignored `apps/api/.env` on runner). If `/health` is **500** or `installed:false` while install is done, restart API with the staging DSN — Vite proxy alone is not enough.
- **Follow-up:** durable hostname on `*.insta-ads.online` via Caddy (CTO/infra) — not blocked for S0.1 J0 remote pass.
- DSN for wizard: company secret `DATABASE_URL_STAGING` — never paste in Plane/Paperclip comments.

Pack detail: project workspace `_default/04-quality/staging-j0-environment.md`.
