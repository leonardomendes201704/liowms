# LioWMS

WMS multi-tenant, browser-first, auto-installable (wizard). Product repo for **OBJ-LIOWMS-001**.

- **Architecture:** modular monolith (Node API + SPA static) — see company pack `03-engineering/adr/ADR-006-modular-monolith-spa.md`
- **Install:** ADR-003 (wizard, install lock, health `installed`)
- **Secrets in-app:** ADR-004 (envelope; no business `.env` in repo)

## Layout (S0.1 bootstrap)

```
apps/api/     # HTTP API (install module first)
apps/web/     # SPA — install wizard K1–K4 (MinIO mocks)
packages/shared/
```

## Branches

`main` + `feature/WMS-###-short-slug` (Plane join key).

## Pack / design

Engineering pack and ADRs live in the Paperclip **LioWMS** project workspace (OBJ-LIOWMS-001) — not duplicated in this repo:

- Install / wizard / health: **ADR-003** (`install` module, install lock, `installed` health)
- In-app secrets (no business `.env`): **ADR-004** (envelope in DB)
- Architecture: **ADR-006** (this monorepo layout)

Canonical pack path (company vault): `/srv/work/second-brain/11-projects/OBJ-LIOWMS-001/`. UI mocks: MinIO gallery `OBJ-LIOWMS-001/design/`.

## Local dev

Postgres required. Run install wizard against empty DB — no committed application secrets.
