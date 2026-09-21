# TC-GOLD S0.6 — QA sign-off (WMS-102 / PAP-166)

| Field | Value |
|-------|--------|
| **origin/main** | `fc8107c` (S0.6 transaction-log + K11) · staging runner @ `110ec9f` |
| **Staging** | https://pierce-playstation-mail-kay.trycloudflare.com (`docs/STAGING-S01.md`) |
| **Date** | 2026-09-21 UTC |
| **Executor** | QA agent (`issue_blockers_resolved` wake) |

## Results

| TC-GOLD | Plane | Result | Method |
|---------|-------|--------|--------|
| **J0e-01** | [WMS-68](https://app.plane.so/paperclip-company/browse/WMS-68/) | **PASS** | Staging HTTPS: `POST` two kernel movements (`Idempotency-Key`) → `GET` transactions `total:2` → projected balance **`15`** (= 10 + 5) for lot `LOT-J0E-*`. |
| **J0d-02** (light) | WMS-65 | **PASS** | `PATCH /api/v1/tenant/audit-events` → **405** |
| **H-03** (light) | WMS-67 | **PASS** | `PATCH /api/v1/tenant/inventory-transactions` → **405** (append-only ledger) |
| **K11** | WMS-101 | **PASS** (shell) | `/app/t/{tenantId}/ledger` → **200** SPA shell on staging HTTPS |

## Staging HTTPS smoke (redacted)

| Check | Result |
|-------|--------|
| `/health` | `installed:true`, migrations **6 / `006_inventory_ledger`** |
| Actor | `qa-j0-smoke@liowms.test` (super_admin; session via staging slot — no password in artifact) |
| Tenant | `1e8e9afb-…` (tenant with plant `planta-fix`) |

```text
curl staging /health
  → migrations 6/006_inventory_ledger
POST /api/v1/tenant/inventory-movements (×2, idempotent keys)
  → 201 / 201
GET  /api/v1/tenant/inventory-transactions?lot_code=…
  → total 2, deltas 10 + 5
GET  /api/v1/tenant/inventory-balances?lot_code=…
  → balance "15"
PATCH inventory-transactions + audit-events
  → 405 / 405
GET  /app/t/{tenantId}/ledger
  → 200
```

## Ops notes (this run)

- Migration `006_inventory_ledger` was pending on `app_staging` (health showed 5/005); applied before execute.
- Staging API process was restarted so ledger routes + `migrations.latest` match S0.6 (`006_inventory_ledger`).

## Notes

- No DSNs, cookies, or passwords stored in this file.
- Workspace integration `inventory-ledger.test.ts` remains gated on `LIOWMS_TEST_PG_ADMIN_DSN` (unchanged).
