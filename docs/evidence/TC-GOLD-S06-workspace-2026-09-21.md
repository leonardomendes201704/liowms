# TC-GOLD S0.6 workspace evidence (WMS-29 / PAP-165)

| Field | Value |
|-------|--------|
| **Date** | 2026-09-21 |
| **Slice** | S0.6 transaction-log + K11 |
| **Branch** | `feature/WMS-100-transaction-log` |

## Automated

- `@liowms/shared` tests: 16/16 pass (includes `tenant-ledger` contract)
- `@liowms/api` `tsc` build: pass
- `@liowms/web` `tsc` + vite build: pass
- `@liowms/api` integration (`inventory-ledger.test.ts`): requires `LIOWMS_TEST_PG_ADMIN_DSN` on runner (same gate as S0.5)

## Manual / staging (post-merge)

1. Login tenant admin on staging HTTPS (`docs/STAGING-S01.md`)
2. Open **Estoque (K11)** — `/app/t/{tenantId}/ledger`
3. Register kernel movement (document + lot + location + qty)
4. Confirm transaction table + projected balance = sum of deltas (J0e-01)

## API smoke (curl, redact cookies)

- `POST /api/v1/tenant/inventory-movements` with `Idempotency-Key`
- `GET /api/v1/tenant/inventory-transactions?lot_code=…`
- `GET /api/v1/tenant/inventory-balances?lot_code=…`
- `PATCH` on transactions → 405
