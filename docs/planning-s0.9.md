Hub: [[OBJ-LIOWMS-001]] · [[05-delivery]]

# Planning S0.9 — Painéis admin plataforma (WMS C5)

**Status:** Planning **fechado** (2026-09-21) · Board aceite [PAP-176](/PAP/issues/PAP-176) plan rev.1; **sem** implementação neste tick.

**Story:** [WMS-32](https://app.plane.so/paperclip-company/browse/WMS-32/) · **Slice:** S0.9 · **Epic:** E-03 Painéis admin (WMS-7) · **Cycle:** WMS C5 (15–28 Nov 2026; exec **sequencial** — WIP=1)

## Valor (READY-1)

Super-admin opera **painel plataforma** completo: tenants com **cotas persistidas**, detalhe tenant/planta (K6–K8), e **offboarding** seguro (K15/K16) com audit ADR-004. Evolui o stub S0.3 sem antecipar shell S-UX nem mestres S1.1.

## Decomposição Plane

| Tipo | Plane | Owner label |
|------|-------|-------------|
| Task BE | [WMS-115](https://app.plane.so/paperclip-company/browse/WMS-115/) | Backend |
| Task FE | [WMS-116](https://app.plane.so/paperclip-company/browse/WMS-116/) | Frontend |
| Task QA | [WMS-117](https://app.plane.so/paperclip-company/browse/WMS-117/) | QA |
| TC-GOLD | [WMS-58](https://app.plane.so/paperclip-company/browse/WMS-58/) (J0b-01), [WMS-59](https://app.plane.so/paperclip-company/browse/WMS-59/) (J12-01), [WMS-60](https://app.plane.so/paperclip-company/browse/WMS-60/) (J12-02), [WMS-73](https://app.plane.so/paperclip-company/browse/WMS-73/) (H-05 regressão pack) | QA |

## Critérios Ready → In Progress

- [x] Story confirmada no pack + Plane: **WMS-32** (`TRACEABILITY.md`)
- [x] Tasks BE/FE/QA filhas materializadas · `start_date`/`target_date` 2026-11-15 → 2026-11-28 (WMS C5)
- [x] TC-GOLD J0b-01 / J12-01 / J12-02 / H-05 mapeados em `04-quality/test-cases.md`
- [x] Acordo TL: escopo = S0.9 apenas — **sem** shell S-UX (WMS-33) nem inbound S2.1
- WIP company = 1 — S0.8 **Done** staging @ `cdce935` ✓

## Notas de aceite (TL)

| TC | Neste slice | Nota |
|----|-------------|------|
| **J0b-01** | **Executar** | Tenant B + cotas persistidas → convite → login isolado (K6/K7) |
| **J12-01** | **Executar** | APIs cross-tenant negadas consistentemente |
| **J12-02** | **Executar** | UI K7/K8 sem mistura entre tenants (W16) |
| **H-05** | Regressão leve | Tokens `lio-*` nos mocks K6/K15/K16 |
| **H-01** | Regressão leve | Export/settings sem cleartext (herdado S0.4+) |

**Fora de escopo neste slice:** shell operação W1 (S-UX), mestres SKU S1.1, inbound S2.1, telemetria OTLP produção.

**Refs engenharia:** brain `architecture.md` módulo **platform** · `ADR-002` RLS · `apps/api/src/platform/` · K6 stub `PlatformTenantsPage.tsx` · `main` @ `cdce935` pós-S0.8 · `docs/STAGING-S01.md`.

## Buffer READY 2–3 (pós-S0.8 ativo)

| Slot | Story | Plane |
|------|-------|-------|
| READY-1 | US-S0.9 Admin painéis | [WMS-32](https://app.plane.so/paperclip-company/browse/WMS-32/) ← **próximo exec** (após S0.8) |
| READY-2 | US-S-UX Shell W1 | [WMS-33](https://app.plane.so/paperclip-company/browse/WMS-33/) |
| READY-3 | US-S1.1 Mestres | [WMS-34](https://app.plane.so/paperclip-company/browse/WMS-34/) |

## Hygiene S0.8 (fechamento)

- [WMS-31](https://app.plane.so/paperclip-company/browse/WMS-31/) + [WMS-109…111](https://app.plane.so/paperclip-company/browse/WMS-109/) **Done** ([PAP-173](/PAP/issues/PAP-173)/[174](/PAP/issues/PAP-174)/[175](/PAP/issues/PAP-175))

**Handoff:** Exec [PAP-177](/PAP/issues/PAP-177) (CTO, WIP=1) · épico [PAP-120](/PAP/issues/PAP-120) **blocked** em PAP-177 · planning [PAP-176](/PAP/issues/PAP-176) **done** · brief `docs/S0.9-execution-brief.md`.
