Hub: [[OBJ-LIOWMS-001]] · [[05-delivery]]

# Planning S0.7 — Outbox e-mail + SMTP real (WMS C4)

**Status:** Planning **fechado** (2026-09-21) · Próximo slice pós-S0.6 (ledger K11); **sem** execução nem envio SMTP neste tick ([PAP-168](/PAP/issues/PAP-168)).

**Story:** [WMS-30](https://app.plane.so/paperclip-company/browse/WMS-30/) · **Slice:** S0.7 · **Epic:** E-05 E-mail (WMS-9) · **Cycle:** WMS C4 (1–14 Nov 2026; exec **sequencial** — WIP=1)

## Valor (READY-1)

Tenant admin com SMTP já persistido (K9, S0.4) vê **outbox transacional** processar convites e reset de senha com **entrega real** no sink staging documentado (K-4, J0c). Worker lê `notify_outbox`, respeita rate limit e **não** loga segredos (ADR-004). UI **K14** mostra fila/DLQ read-only + ações de retry seguras.

## Decomposição Plane

| Tipo | Plane | Owner label |
|------|-------|-------------|
| Task BE | [WMS-106](https://app.plane.so/paperclip-company/browse/WMS-106/) | Backend |
| Task FE | [WMS-107](https://app.plane.so/paperclip-company/browse/WMS-107/) | Frontend |
| Task QA | [WMS-108](https://app.plane.so/paperclip-company/browse/WMS-108/) | QA |
| TC-GOLD | [WMS-69](https://app.plane.so/paperclip-company/browse/WMS-69/) (J0c-01), [WMS-70](https://app.plane.so/paperclip-company/browse/WMS-70/) (J0c-02) | QA |

## Critérios Ready → In Progress

- [x] Story confirmada no pack + Plane: **WMS-30** (`TRACEABILITY.md`)
- [x] Tasks BE/FE/QA filhas materializadas (WMS-106…108) · `start_date`/`target_date` 2026-11-01 → 2026-11-14
- [x] TC-GOLD J0c-01 / J0c-02 mapeados em `04-quality/test-cases.md` (filhos Plane WMS-69/70)
- [x] Acordo TL: escopo = S0.7 apenas — **sem** telemetria OTLP plena (S0.8) nem mestres S1.1
- WIP company = 1 — **não** puxar S0.7 até S0.6 **Done** no staging (conveyor §80F) ✓ pós-[PAP-167](/PAP/issues/PAP-167)

## Notas de aceite (TL)

| TC | Neste slice | Nota |
|----|-------------|------|
| **J0c-01** | **Executar** | SMTP envelope → convite teste → e-mail no sink staging |
| **J0c-02** | **Executar** | Reset senha end-to-end com link no e-mail |
| **J0d-01** | Regressão leve | Alteração SMTP gera audit (herdado S0.5) |
| **H-01** | Regressão leve | Export/settings sem cleartext |

**Fora de escopo neste slice:** wizard SMTP opcional (S0.1), inbound S2.1, telemetria K12 (S0.8).

**Refs engenharia:** `architecture.md` módulo **notify** · `ADR-004` · `ADR-006` (worker in-process/cron) · K14 mock MinIO · `main` @ `110ec9f` pós-S0.6 · staging `docs/STAGING-S01.md` (liowms) + sink SMTP no Review.

## Buffer READY 2–3 (pós-S0.6 ativo)

| Slot | Story | Plane |
|------|-------|-------|
| READY-1 | US-S0.7 Outbox e-mail | [WMS-30](https://app.plane.so/paperclip-company/browse/WMS-30/) ← **próximo exec** |
| READY-2 | US-S0.8 Telemetria | [WMS-31](https://app.plane.so/paperclip-company/browse/WMS-31/) |
| READY-3 | US-S0.9 Admin painéis | [WMS-32](https://app.plane.so/paperclip-company/browse/WMS-32/) |

## Hygiene S0.6 (fechamento)

- [WMS-29](https://app.plane.so/paperclip-company/browse/WMS-29/) + [WMS-100…102](https://app.plane.so/paperclip-company/browse/WMS-100/) **Done** (exec [PAP-165](/PAP/issues/PAP-165) · release [PAP-167](/PAP/issues/PAP-167))

**Handoff:** CEO delega execução CTO **após** planning fechado · thread [PAP-120](/PAP/issues/PAP-120) permanece **blocked** (E2BIG; **não** retry neste tick) · planning [PAP-168](/PAP/issues/PAP-168) — **sem** dispatch BE/FE/QA neste tick.
