# `@liowms/api`

HTTP API (modular monolith). **S0.1 / WMS-87:** install module — migrations, install lock, `GET /health` (H-4), wizard endpoints. **S0.2 / WMS-89:** auth session, RBAC bootstrap, reset/convite.

## Run

```bash
npm install
npm run start -w @liowms/api
```

Optional infra DSN (Release / local after install): `DATABASE_URL` — never commit business secrets.

## H-4 — `GET /health`

| Field | Description |
|-------|-------------|
| `contract` | `h-4.v1` |
| `installed` | `true` when `install_lock` active |
| `phase` | `uninstalled` \| `installing` \| `installed` |
| `status` | `uninstalled` \| `installing` \| `ok` \| `degraded` |
| `service` | `liowms-api` |
| `version` | API semver |
| `migrations.applied` / `migrations.latest` | Schema migration state |
| `queues.ready` / `queues.detail` | Outbox readiness (S0.1 stub) |

## Install wizard API (`/api/v1/install/*`)

Only when **uninstalled**. After install → `404` + K4 envelope (`screen: "K4"`).

| Method | Path | Body |
|--------|------|------|
| `POST` | `/api/v1/install/dsn/test` | `{ "dsn": "postgresql://..." }` |
| `POST` | `/api/v1/install/complete` | DSN + `admin` + optional `tenant`, `locale`, `timezone` |

DSN is **not** written to disk; password values are redacted from logs.

## Auth API (`/api/v1/auth/*`)

Requires **installed** instance. Business routes under `/api/v1/*` require a valid session (cookie `lio_session` or `Authorization: Bearer` JWT).

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/v1/auth/login` | Public |
| `POST` | `/api/v1/auth/logout` | Session |
| `GET` | `/api/v1/auth/me` | Session |
| `POST` | `/api/v1/auth/password-reset/request` | Public |
| `POST` | `/api/v1/auth/password-reset/confirm` | Public |
| `POST` | `/api/v1/auth/invites` | super_admin / tenant_admin |
| `POST` | `/api/v1/auth/invites/accept` | Public |

Password reset and invite e-mail bodies are queued in `notify_outbox` (stub until S0.7 SMTP).

## Tenant settings (`/api/v1/tenant/settings`) — S0.4 / WMS-94

Requires **tenant_admin** or **super_admin**. Use header `x-lio-tenant-id` when the session has no active tenant.

| Method | Path | Body |
|--------|------|------|
| `GET` | `/api/v1/tenant/settings` | — |
| `PATCH` | `/api/v1/tenant/settings` | `{ "plain": { "smtp.host": "…" }, "secrets": { "smtp.password": "…" } }` |

Secrets are envelope-encrypted (ADR-004); responses never include cleartext. SMTP saves enqueue `smtp_config_saved` on `notify_outbox` (stub). **PATCH** writes an append-only row in `audit.audit_events` (secrets masked per ADR-004).

## Tenant audit log (`/api/v1/tenant/audit-events`) — S0.5 / WMS-97

Read-only for **tenant_admin** / **super_admin**. Query: `page`, `limit`, `actor`, `entity_type`, `from`, `to`. **PATCH/DELETE/POST** return **405** (append-only).

## Tests

```bash
# Admin DSN must allow CREATE DATABASE (company `postgres` superuser or role with CREATEDB).
LIOWMS_TEST_PG_ADMIN_DSN='postgresql://…' npm run test -w @liowms/api
```

Covers TC-GOLD **J0-02** (health), **J0-04** (migration rollback), **WMS-89** (login K5, J0c-02 reset happy path, invite), **WMS-97** (**J0d-02** immutability + config PATCH audit writer smoke).

Pack: ADR-003, ADR-004 · `04-quality/test-cases.md`
