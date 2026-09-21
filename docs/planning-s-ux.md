Hub: [[OBJ-LIOWMS-001]] · [[05-delivery]]

# Planning S-UX — Shell autenticado operação W1 (WMS C6)

**Status:** Exec **Done** (2026-09-21) · [PAP-181](/PAP/issues/PAP-181) · QA [WMS-120](https://app.plane.so/paperclip-company/browse/WMS-120/) pendente.

**Story:** [WMS-33](https://app.plane.so/paperclip-company/browse/WMS-33/) · **Slice:** S-UX · **Epic:** E-03 Painéis admin ([WMS-7](https://app.plane.so/paperclip-company/browse/WMS-7/)) · **Cycle:** WMS C6 (29 Nov–12 Dec 2026; exec **sequencial** — WIP=1)

## Valor (READY-2 pós-S0.9)

Operador autenticado usa **shell de operação W1** (K13) com navegação RBAC-aware: `operator` vê home/planta e fluxos permitidos (ex. ledger read); `tenant_admin` mantém atalhos admin existentes. APIs e router negam rotas admin ao operador de forma consistente (J12-02). Evolui `AppShellPage` / redirects pós-S0.9 **sem** mestres S1.1, inbound S2.1, nem coletor PWA E-20.

## Decomposição Plane

| Tipo | Plane | Owner label |
|------|-------|-------------|
| Task BE | [WMS-118](https://app.plane.so/paperclip-company/browse/WMS-118/) | Backend |
| Task FE | [WMS-119](https://app.plane.so/paperclip-company/browse/WMS-119/) | Frontend |
| Task QA | [WMS-120](https://app.plane.so/paperclip-company/browse/WMS-120/) | QA |
| TC-GOLD | [WMS-60](https://app.plane.so/paperclip-company/browse/WMS-60/) (J12-02), [WMS-73](https://app.plane.so/paperclip-company/browse/WMS-73/) (H-05 regressão pack), [WMS-64](https://app.plane.so/paperclip-company/browse/WMS-64/) (H-01 regressão leve) | QA |

## Critérios Ready → In Progress

- [x] Story confirmada no pack + Plane: **WMS-33**
- [x] Tasks BE/FE/QA filhas materializadas · `start_date`/`target_date` 2026-11-29 → 2026-12-12 (WMS C6)
- [x] TC-GOLD J12-02 / H-05 / H-01 mapeados para este slice (convite operador coberto em suite QA)
- [ ] Acordo TL: escopo = S-UX W1 apenas — **sem** mestres S1.1 ([WMS-34](https://app.plane.so/paperclip-company/browse/WMS-34/)) nem inbound S2.1
- WIP company = 1 — **não** puxar S-UX até S0.9 **Done** staging @ `16ad624` / migration **009** ✓

## Notas de aceite (TL)

| TC | Neste slice | Nota |
|----|-------------|------|
| **J12-02** | **Executar** | Operador não acessa UI/API admin; W16 copy coerente |
| **H-05** | Regressão leve | Tokens `lio-*` no shell K13 + páginas tocadas |
| **H-01** | Regressão leve | Settings/export sem cleartext (herdado S0.4+) |
| **Convite operador** | **Executar** (QA) | Happy path `auth-session` — role `operator` pós-login |

**Fora de escopo neste slice:** CRUD mestres SKU/lote S1.1, topologia S1.2+, inbound S2.1, PWA coletor E-20, telemetria OTLP produção.

**Refs engenharia:** `apps/web/src/pages/AppShellPage.tsx` · `AppHomeRedirect` · `RequireRole` / `RequireTenantAccess` · `apps/api/src/tenant/routes.ts` (plantas) · `ledger/routes.ts` (operator já permitido) · brain módulo **platform/tenant UI** · `main` @ `16ad624` pós-S0.9 · `docs/STAGING-S01.md`.

## Buffer READY 2–3 (pós-S0.9 ativo)

| Slot | Story | Plane |
|------|-------|-------|
| READY-1 | US-S-UX Shell W1 | [WMS-33](https://app.plane.so/paperclip-company/browse/WMS-33/) ← **próximo exec** (após S0.9) |
| READY-2 | US-S1.1 Mestres | [WMS-34](https://app.plane.so/paperclip-company/browse/WMS-34/) |
| READY-3 | US-S1.2 Topologia | [WMS-35](https://app.plane.so/paperclip-company/browse/WMS-35/) |

## Hygiene S0.9 (fechamento)

- [WMS-32](https://app.plane.so/paperclip-company/browse/WMS-32/) + [WMS-115…117](https://app.plane.so/paperclip-company/browse/WMS-115/) **Done** ([PAP-177](/PAP/issues/PAP-177) · [PAP-178](/PAP/issues/PAP-178) · [PAP-179](/PAP/issues/PAP-179) @ `16ad624`)

**Handoff:** Slice S-UX planning **fechado** — exec/QA/release children sob [PAP-120](/PAP/issues/PAP-120) · `docs/S-UX-execution-brief.md` · próximo READY-2 [WMS-34](https://app.plane.so/paperclip-company/browse/WMS-34/) (planning S1.1).
