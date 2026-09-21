# S-UX execution brief — Shell operação W1 (WMS-33)

| Field | Value |
|-------|--------|
| **Story** | [WMS-33](https://app.plane.so/paperclip-company/browse/WMS-33/) |
| **Slice** | S-UX — shell autenticado operação W1 (K13) |
| **Baseline** | `main` pós-S0.9 (`16ad624`, migration **009**) |
| **Staging** | `docs/STAGING-S01.md` |
| **Planning** | `docs/planning-s-ux.md` · [PAP-180](/PAP/issues/PAP-180) done |
| **Parent** | Paperclip exec children under [PAP-120](/PAP/issues/PAP-120) |
| **Cycle** | WMS C6 · 2026-11-29 → 2026-12-12 |

## Valor

Operador autenticado usa **shell de operação W1** (K13) com navegação RBAC-aware: `operator` vê home/planta e fluxos permitidos (ex. ledger read); `tenant_admin` mantém atalhos admin existentes. APIs e router negam rotas admin ao operador de forma consistente (J12-02).

## Fora de escopo

- CRUD mestres SKU/lote S1.1 ([WMS-34](https://app.plane.so/paperclip-company/browse/WMS-34/))
- Topologia S1.2+, inbound S2.1, PWA coletor E-20
- Export OTLP produção completo

## Backend ([WMS-118](https://app.plane.so/paperclip-company/browse/WMS-118/))

1. RBAC operator — plant read APIs alinhadas a `RequireRole` / tenant routes
2. Negar rotas admin a `operator` em APIs tocadas pelo shell (J12-02)
3. ADR-002/004 — sem vazamento cross-tenant em leituras planta

## Frontend ([WMS-119](https://app.plane.so/paperclip-company/browse/WMS-119/))

**K13** — evoluir `AppShellPage`, `AppHomeRedirect`, nav RBAC-aware; operador sem atalhos admin; `tenant_admin` inalterado nos fluxos admin existentes; estados W16.

## QA ([WMS-120](https://app.plane.so/paperclip-company/browse/WMS-120/)) — child separada após BE+FE

| TC | Neste slice |
|----|-------------|
| **J12-02** | **Executar** — operador não acessa UI/API admin |
| **H-05** | Regressão leve — tokens `lio-*` no shell K13 |
| **H-01** | Regressão leve — settings/export sem cleartext |
| **Convite operador** | **Executar** — happy path `auth-session`, role `operator` pós-login |

## Aceite exec

- `main` com BE+FE; staging HTTPS shell operador + regressões
- `docs/STAGING-S01.md` SHA atualizado na child release
- C1 `BRAIN-GRAPH.md` + STATUS na child de execução

## Testes

Integração API tenant/plant + router web; `npm test -w @liowms/api` / web unit conforme áreas tocadas.

## Refs engenharia

`apps/web/src/pages/AppShellPage.tsx` · `AppHomeRedirect` · `RequireRole` / `RequireTenantAccess` · `apps/api/src/tenant/routes.ts` · `ledger/routes.ts`
