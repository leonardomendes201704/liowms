-- LioWMS S0.3 tenant RLS + plants (WMS-91)
CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS plants_tenant_id_idx ON plants (tenant_id);

ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants FORCE ROW LEVEL SECURITY;

CREATE POLICY plants_tenant_isolation ON plants
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = '1'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = '1'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

ALTER TABLE config_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_secrets FORCE ROW LEVEL SECURITY;

CREATE POLICY config_secrets_tenant_isolation ON config_secrets
  FOR ALL
  USING (
    tenant_id IS NULL
    OR current_setting('app.rls_bypass', true) = '1'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id IS NULL
    OR current_setting('app.rls_bypass', true) = '1'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

INSERT INTO schema_migrations (version) VALUES ('003_tenant_rls')
ON CONFLICT DO NOTHING;
