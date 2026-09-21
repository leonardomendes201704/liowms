# LioWMS S0.1 — staging HTTPS (board / TC-GOLD J0)

| Field | Value |
|-------|--------|
| **Base URL** | https://essex-reach-consultant-genetic.trycloudflare.com |
| **Wizard** | `/install` |
| **Health** | `/health` (expect `installed: false` after Release DB reset) |
| **Git** | https://github.com/leonardomendes201704/liowms @ `main` → `32f3358` |
| **Postgres slot** | `app_staging` (company Docker Postgres) |

## Ops notes (Release)

- Tunnel: Cloudflare quick tunnel (`cloudflared`) → local Vite `5173` (proxies `/api`, `/health`).
- **Liveness:** URL is valid while `cloudflared`, `@liowms/api`, and `@liowms/web` dev processes are running on the company runner.
- **Follow-up:** durable hostname on `*.insta-ads.online` via Caddy (CTO/infra) — not blocked for S0.1 J0 remote pass.
- DSN for wizard: company secret `DATABASE_URL_STAGING` — never paste in Plane/Paperclip comments.

Pack detail: project workspace `_default/04-quality/staging-j0-environment.md`.
