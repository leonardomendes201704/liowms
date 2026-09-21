-- LioWMS S0.4 config store (WMS-94)
CREATE TABLE IF NOT EXISTS config_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);

CREATE INDEX IF NOT EXISTS config_settings_tenant_id_idx ON config_settings (tenant_id);

ALTER TABLE config_secrets
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE config_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY config_settings_tenant_isolation ON config_settings
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = '1'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = '1'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

INSERT INTO schema_migrations (version) VALUES ('004_config_store')
ON CONFLICT DO NOTHING;
