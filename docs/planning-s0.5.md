# Planning S0.5 — Audit-log append-only (WMS C2→C3)

**Status:** Planning **fechado** (2026-09-21) · Acordo TL **herdado** — próximo slice pós-S0.4; **sem** antecipar S0.6 (transaction-log).

**Story:** [WMS-28](https://app.plane.so/paperclip-company/browse/WMS-28/) · **Slice:** S0.5 · **Cycle:** WMS C2 (4–17 Oct 2026) / buffer C3

## Valor (READY-1)

Tenant admin vê **audit-log append-only** de mudanças de config (K9) e ações admin relevantes — eventos com ator, entidade, before/after **sem cleartext de segredos** (K-3, H-2). API produto **não** permite PATCH/DELETE de eventos. Fecha deferral **J0d-01** de S0.4.

## Decomposição Plane

| Tipo | Plane | Owner label |
|------|-------|-------------|
| Task BE | [WMS-97](https://app.plane.so/paperclip-company/browse/WMS-97/) | Backend |
| Task FE | [WMS-98](https://app.plane.so/paperclip-company/browse/WMS-98/) | Frontend |
| Task QA | [WMS-99](https://app.plane.so/paperclip-company/browse/WMS-99/) | QA |
| TC-GOLD | [WMS-63](https://app.plane.so/paperclip-company/browse/WMS-63/) (J0d-01), [WMS-65](https://app.plane.so/paperclip-company/browse/WMS-65/) (J0d-02), [WMS-67](https://app.plane.so/paperclip-company/browse/WMS-67/) (H-03) | QA |

## Critérios Ready → In Progress

- [x] Story com valor + Tasks BE/FE/QA filhas (WMS-97…99)
- [x] TC-GOLD J0d-01 / J0d-02 / H-03 filhos mapeados (`04-quality/test-cases.md`)
- [x] Acordo TL: escopo = S0.5 apenas — **sem** antecipar S0.6 (ledger K11) nem outbox SMTP real (S0.7)
- WIP company = 1 ao puxar S0.5 (conveyor §80F)

## Notas de aceite (TL)

| TC | Neste slice | Nota |
|----|-------------|------|
| **J0d-01** | **Executar** | PATCH K9 → evento audit com ator + diff; segredos mascarados |
| **J0d-02** | **Executar** | PATCH/DELETE audit → 403/405; zero linhas alteradas |
| **H-03** | **Executar** | Regressão imutabilidade (alias J0d-02) em release kernel |
| **H-01** | Regressão leve | Settings export ainda sem cleartext (herdado S0.4) |

**Refs engenharia:** `architecture.md` schema **audit** · `ADR-004` (no secret in audit payload) · K10 mock MinIO · `main` @ `10b0262` pós-S0.4 · staging `docs/STAGING-S01.md`.

## Buffer READY 2–3

| Slot | Story | Plane |
|------|-------|-------|
| READY-2 | US-S0.5 Audit-log | [WMS-28](https://app.plane.so/paperclip-company/browse/WMS-28/) ← **READY-1 ativo** |
| READY-3 | US-S0.6 Transaction-log | [WMS-29](https://app.plane.so/paperclip-company/browse/WMS-29/) |

## Hygiene S0.4 (fechamento)

- [WMS-27](https://app.plane.so/paperclip-company/browse/WMS-27/) + [WMS-94…96](https://app.plane.so/paperclip-company/browse/WMS-94/) **Done** (exec [PAP-153](/PAP/issues/PAP-153) · QA [PAP-156](/PAP/issues/PAP-156))

**Handoff:** CEO delega execução CTO · thread [PAP-120](/PAP/issues/PAP-120) · exec espelho **PAP-153** (parent + BE/FE/QA/Release filhos).
