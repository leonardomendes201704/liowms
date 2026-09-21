Hub: [[OBJ-LIOWMS-001]] · [[05-delivery]]

# Planning S0.8 — Telemetria + health JSON (WMS C4)

**Status:** Planning **fechado** (2026-09-21) · Próximo slice pós-S0.7 (outbox K14); **sem** implementação OTLP/export neste tick ([PAP-172](/PAP/issues/PAP-172)).

**Story:** [WMS-31](https://app.plane.so/paperclip-company/browse/WMS-31/) · **Slice:** S0.8 · **Epic:** E-08 Telemetria (WMS-12) · **Cycle:** WMS C4 (1–14 Nov 2026; exec **sequencial** — WIP=1)

## Valor (READY-1)

Operador e plataforma veem **health JSON estável** (`h-4.v1`, K12) com migrations/filas/outbox worker refletidos em staging, **gancho OTLP** configurável por env (sem PII cross-tenant, H-3), e UI K12 read-only de status agregado. Não antecipa painéis S0.9 nem mestres S1.1.

## Decomposição Plane

| Tipo | Plane | Owner label |
|------|-------|-------------|
| Task BE | [WMS-109](https://app.plane.so/paperclip-company/browse/WMS-109/) | Backend |
| Task FE | [WMS-110](https://app.plane.so/paperclip-company/browse/WMS-110/) | Frontend |
| Task QA | [WMS-111](https://app.plane.so/paperclip-company/browse/WMS-111/) | QA |
| TC-GOLD | [WMS-71](https://app.plane.so/paperclip-company/browse/WMS-71/) (H-02), [WMS-61](https://app.plane.so/paperclip-company/browse/WMS-61/) (J12-03), [WMS-72](https://app.plane.so/paperclip-company/browse/WMS-72/) (H-04 regressão pack) | QA |

## Critérios Ready → In Progress

- [x] Story confirmada no pack + Plane: **WMS-31** (`TRACEABILITY.md`)
- [x] Tasks BE/FE/QA filhas planejadas · `start_date`/`target_date` 2026-11-01 → 2026-11-14 (herdar WMS C4)
- [x] TC-GOLD H-02 / J12-03 / H-04 mapeados em `04-quality/test-cases.md`
- [x] Acordo TL: escopo = S0.8 apenas — **sem** painéis plataforma S0.9 nem inbound S2.1
- WIP company = 1 — **não** puxar S0.8 até S0.7 **Done** no staging ✓ pós-[PAP-171](/PAP/issues/PAP-171)

## Notas de aceite (TL)

| TC | Neste slice | Nota |
|----|-------------|------|
| **H-02** | **Executar** | `/health` responde schema `HealthResponseH4` (`packages/shared/src/health.ts`); migrations + `queues.detail` coerentes pós-S0.7 |
| **J12-03** | **Executar** | Payloads telemetria agregada sem lote/cliente identificável cross-tenant (deferido desde S0.3) |
| **H-04** | Regressão leve | PNG UI só MinIO — pack transversal |
| **H-01** | Regressão leve | Export/settings sem cleartext (herdado S0.4+) |

**Fora de escopo neste slice:** export OTLP produção completo, dashboards externos, alertas paging, genealogia S2.7.

**Refs engenharia:** brain `architecture.md` módulo **telemetry** · `ADR-004` · health `apps/api/src/health/routes.ts` · K12 mock MinIO · `main` @ `68e3038` pós-S0.7 · `docs/STAGING-S01.md`.

## Buffer READY 2–3 (pós-S0.7 ativo)

| Slot | Story | Plane |
|------|-------|-------|
| READY-1 | US-S0.8 Telemetria | [WMS-31](https://app.plane.so/paperclip-company/browse/WMS-31/) ← **próximo exec** |
| READY-2 | US-S0.9 Admin painéis | [WMS-32](https://app.plane.so/paperclip-company/browse/WMS-32/) |
| READY-3 | US-S-UX Shell W1 | [WMS-33](https://app.plane.so/paperclip-company/browse/WMS-33/) |

## Hygiene S0.7 (fechamento)

- [WMS-30](https://app.plane.so/paperclip-company/browse/WMS-30/) + [WMS-106…108](https://app.plane.so/paperclip-company/browse/WMS-106/) **Done** (exec [PAP-169](/PAP/issues/PAP-169) · QA [PAP-170](/PAP/issues/PAP-170) · release [PAP-171](/PAP/issues/PAP-171))

**Handoff:** Exec [PAP-173](/PAP/issues/PAP-173) (CTO, WIP=1) · épico [PAP-120](/PAP/issues/PAP-120) **blocked** em PAP-173 · planning [PAP-172](/PAP/issues/PAP-172) done · brief `docs/S0.8-execution-brief.md`.
