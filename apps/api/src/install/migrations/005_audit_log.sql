-- LioWMS S0.5 audit log append-only (WMS-97)
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID REFERENCES platform_users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB
);

CREATE INDEX IF NOT EXISTS audit_events_tenant_occurred_idx
  ON audit.audit_events (tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_tenant_actor_idx
  ON audit.audit_events (tenant_id, actor_user_id);

ALTER TABLE audit.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.audit_events FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_events_tenant_isolation ON audit.audit_events
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = '1'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = '1'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

CREATE OR REPLACE FUNCTION audit.deny_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS audit_events_no_mutation ON audit.audit_events;
CREATE TRIGGER audit_events_no_mutation
  BEFORE UPDATE OR DELETE ON audit.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION audit.deny_audit_mutation();

REVOKE ALL ON TABLE audit.audit_events FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE audit.audit_events TO PUBLIC;

INSERT INTO schema_migrations (version) VALUES ('005_audit_log')
ON CONFLICT DO NOTHING;
