# TC-GOLD S0.7 — QA sign-off (WMS-108 / PAP-170)

| Field | Value |
|-------|--------|
| **Workspace git** | `8c2fb5c` (S0.7 code @ `68e3038` — [PAP-169](/PAP/issues/PAP-169)) |
| **Staging** | https://pierce-playstation-mail-kay.trycloudflare.com (`docs/STAGING-S01.md`) |
| **Date** | 2026-09-21 UTC |
| **Executor** | QA agent (PAP-170) |

## Results

| TC-GOLD | Plane | Result | Method |
|---------|-------|--------|--------|
| **J0c-01** | [WMS-69](https://app.plane.so/paperclip-company/browse/WMS-69/) | **PASS** | K9 envelope (tenant root) + outbox worker → invite e-mail in staging SMTP sink (Mailpit K-4 on runner `127.0.0.1:1025`); link uses `LIOWMS_PUBLIC_APP_URL` host. |
| **J0c-02** | [WMS-70](https://app.plane.so/paperclip-company/browse/WMS-70/) | **PASS** | Forgot-password → e-mail in sink → reset confirm → login K5 path via API on staging HTTPS. |
| **H-01** | [WMS-64](https://app.plane.so/paperclip-company/browse/WMS-64/) | **PASS** (regression) | `GET /api/v1/tenant/settings` — SMTP password masked (`secret` / no cleartext). |

## Staging ops (this run)

| Check | Result |
|-------|--------|
| `/health` | `installed:true`, migrations **7 / `007_notify_outbox_s07`**, `outbox:worker` |
| `LIOWMS_PUBLIC_APP_URL` | Set to staging HTTPS base on restarted `@liowms/api` |
| K-4 sink | Mailpit (`127.0.0.1:1025` / UI `8025`); tenant SMTP host pointed at sink for delivery |
| K14 | `GET /api/v1/tenant/notify-outbox` **200** (super-admin + tenant header) |

## Commands (redacted)

```text
Restart @liowms/api with DATABASE_URL_STAGING + LIOWMS_PUBLIC_APP_URL
curl staging /health → 007_notify_outbox_s07
POST password-reset/request → worker → Mailpit message → POST password-reset/confirm → login 200
POST auth/invites → worker → Mailpit invite with staging /invite/accept link
GET tenant/notify-outbox → 200
```

## Notes

- Staging slot hygiene: added `tenant_admin` membership for QA actor on root tenant so outbox rows carry `tenant_id` (prior rows had `missing_tenant`).
- No SMTP passwords, session cookies, reset/invite tokens, or DSNs stored in this artifact.
