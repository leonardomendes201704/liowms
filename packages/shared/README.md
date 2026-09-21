## Shared contracts

- **H-4 health:** `health.ts` (`HealthResponseH4`)
- **Install K4 errors:** `install.ts` (`INSTALL_ERROR_*`, `installK4Error`)
- **Wizard UI mapping:** `wizard-state.ts` (`installCodeToK4`, `k4Title`)

HTTP paths (`INSTALL_HTTP`) match `@liowms/api` routes:

- `POST /api/v1/install/dsn/test`
- `POST /api/v1/install/complete`
