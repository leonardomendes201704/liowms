# S0.9 workspace evidence (WMS-32)

| Check | Result |
|-------|--------|
| `@liowms/shared` build | pass |
| `@liowms/api` `tsc` | pass |
| `@liowms/web` `tsc` + Vite build | pass |
| `platform-s09.test.ts` | requires `LIOWMS_TEST_PG_ADMIN_DSN` on runner |

## Scope delivered

- Migration `009_platform_tenant_s09` (`quota_users`, `deactivated_at`)
- Platform APIs: create/list/detail/patch quota, `POST …/offboard` + audit `tenant.offboard`
- Tenant routes reject offboarded tenants (403)
- FE: `PlatformTenantDetailPage` (K8/K15/K16), K6 list links
