-- S0.9: platform tenant quotas + offboarding (WMS-115 / WMS-32)

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS quota_users INTEGER,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

INSERT INTO schema_migrations (version) VALUES ('009_platform_tenant_s09');
