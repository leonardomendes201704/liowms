# `@liowms/api`

HTTP API (modular monolith). **S0.1 / WMS-87:** install module — migrations, install lock, `GET /health` (H-4), wizard endpoints.

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

## Tests

```bash
LIOWMS_TEST_PG_ADMIN_DSN='postgresql://…' npm run test -w @liowms/api
```

Covers TC-GOLD **J0-02** (health) and **J0-04** (migration rollback / no `install_lock`).

Pack: ADR-003, ADR-004 · `04-quality/test-cases.md`
