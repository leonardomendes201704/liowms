-- S0.8: tenant-scoped telemetry aggregates (WMS-109 / H-3)

CREATE TABLE IF NOT EXISTS telemetry_counters (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, metric_key)
);

CREATE INDEX IF NOT EXISTS telemetry_counters_tenant_idx
  ON telemetry_counters (tenant_id);

ALTER TABLE telemetry_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_counters FORCE ROW LEVEL SECURITY;

CREATE POLICY telemetry_counters_tenant_isolation ON telemetry_counters
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = '1'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = '1'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

INSERT INTO schema_migrations (version) VALUES ('008_telemetry_s08')
ON CONFLICT DO NOTHING;
