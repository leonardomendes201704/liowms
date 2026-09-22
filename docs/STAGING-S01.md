# LioWMS S0.1 — staging HTTPS (board / TC-GOLD J0)

| Field | Value |
|-------|--------|
| **Base URL** | https://preview.insta-ads.online/liowms |
| **Wizard** | `/install` |
| **Health** | `/health` (expect `installed: false` after Release DB reset) |
| **Git** | https://github.com/leonardomendes201704/liowms @ `main` + S3.2 exec slice ([PAP-253](/PAP/issues/PAP-253) · migration `020_production_yield_audit_s32` pós-S3.1 `019`) |
| **K6–K8** | `/app/platform/tenants` · `/app/platform/tenants/{tenantId}` (cotas + offboarding) |
| **K13** | `/app/t/{tenantId}/plants` · `/app/t/{tenantId}/ledger` (shell operação W1; operador RBAC-aware) |
| **W7** | `/app/t/{tenantId}/masters` (mestres SKU / lote / UoM; S1.1) |
| **W13** | `/app/t/{tenantId}/topology` (zonas / corredores / endereços; S1.2) |
| **W2** | `/app/t/{tenantId}/map` (mapa 2D read-only + SSE ADR-009 + ocupação real; S1.3/S1.4) |
| **W14** | `/app/t/{tenantId}/inventory` (saldos por endereço + ocupação mapa; S1.4) |
| **W5** | `/app/t/{tenantId}/receipt` (recebimento + quarentena; S2.1) |
| **W6** | `/app/t/{tenantId}/putaway` (putaway quarentena → destino; S2.2) |
| **W8** | `/app/t/{tenantId}/hold` (hold operacional + release; S2.3) · migration `013_inventory_hold_s23` |
| **W9** | `/app/t/{tenantId}/rules` (regra FEFO + preview sugestão; S2.4) · migration `014_config_rules_s24` |
| **W10** | `/app/t/{tenantId}/picking` (onda FEFO + confirmação pick; S2.5) · migration `015_outbound_picking_s25` |
| **W11** | `/app/t/{tenantId}/production` (produção liofilização OP/ciclo + rendimento stub + audit trail; S3.1/S3.2) · migration `020_production_yield_audit_s32` |
| **W16** | `/app/t/{tenantId}/shipping` (expedição + ship confirm; S2.6) · migration `016_outbound_shipping_s26` |
| **W15** | `/app/t/{tenantId}/integrations` (hub webhooks + log entregas; S2.7) · migration `017_hub_s27` |
| **W12** | `/app/t/{tenantId}/genealogy` (árvore MP → acabado + refs expedição; S2.8) · migration `018_genealogy_s28` |
| **K12** | `/app/t/{tenantId}/kernel` (telemetria read-only) |
| **Postgres slot** | `app_staging` (company Docker Postgres) |

## Ops notes (Release)

- **Board preview (VPS):** Caddy `deploy-caddy-1` → Docker `liowms-staging-preview` on `deploy_instaads` (`handle /liowms/*` → `liowms-staging-preview:5173`; config `/opt/instaads/deploy/Caddyfile`). Postgres via `company-postgres` on the same network (`app_staging`).
- **Dev-only (não board):** Cloudflare quick tunnel (`cloudflared`) → host Vite `5173` — agentes no runner; **não** usar como URL de aceite ([PAP-245](/PAP/issues/PAP-245)).
- **Vite host check:** `apps/web/vite.config.ts` allows `preview.insta-ads.online` and `*.trycloudflare.com`. After config changes, **restart** `liowms-staging-preview` or dev server or Board may see HTTP 403. Optional: `LIOWMS_STAGING_PREVIEW=1` or `LIOWMS_VITE_ALLOWED_HOST=<hostname>`.
- **Blank page (Chrome):** if `GET /liowms/@vite/client` returns **`Content-Type: text/html`**, the browser blocks `type=module` scripts → white screen. Fix: `vite-staging-module-mime` plugin in `apps/web/vite.config.ts` (PAP-270); then `docker restart liowms-staging-preview`. Smoke: DevTools → Network → `@vite/client` must be `text/javascript`.
- **Liveness:** Board URL while `docker ps` shows `liowms-staging-preview` healthy and Caddy is up.
- **API DSN:** container `DATABASE_URL` host `company-postgres`, database `app_staging` (same credentials as runner `apps/api/.env`). If `/health` is **500** or `installed:false` while install is done, `docker restart liowms-staging-preview`.
- **Durable preview (board):** `https://preview.insta-ads.online/liowms/` ([PAP-245](/PAP/issues/PAP-245) / [PAP-249](/PAP/issues/PAP-249)). Caddy forwards **full** paths (`/liowms/*`) without stripping the prefix.
- **Subpath env (runner):** set on `@liowms/web` and `@liowms/api` before restart:
  - `LIOWMS_BASE_PATH=/liowms` — Vite `base`, router basename, dev proxy `/liowms/api` → `:3000` `/api`
  - `LIOWMS_PUBLIC_APP_URL=https://preview.insta-ads.online/liowms` — convite/reset links
  - `LIOWMS_SESSION_COOKIE_SECURE=1` — session cookie on HTTPS preview
  - `LIOWMS_VITE_ALLOWED_HOST=preview.insta-ads.online` (optional; host is allowlisted when subpath is used)
- **Smoke:** `GET /liowms/health` → same JSON as local `:3000/health`; login at `/liowms/login`.
- DSN for wizard: company secret `DATABASE_URL_STAGING` — never paste in Plane/Paperclip comments.

Pack detail: project workspace `_default/04-quality/staging-j0-environment.md`.
