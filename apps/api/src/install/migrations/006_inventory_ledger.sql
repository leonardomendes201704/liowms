-- LioWMS S0.6 inventory transaction-log append-only (WMS-100 / ADR-005)
CREATE SCHEMA IF NOT EXISTS ledger;

CREATE TABLE IF NOT EXISTS ledger.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID REFERENCES platform_users(id),
  movement_type TEXT NOT NULL DEFAULT 'kernel',
  document_ref TEXT NOT NULL,
  lot_code TEXT NOT NULL,
  location_code TEXT NOT NULL,
  quantity_delta NUMERIC(18, 6) NOT NULL,
  uom TEXT NOT NULL DEFAULT 'UN',
  idempotency_key TEXT NOT NULL,
  CONSTRAINT inventory_transactions_idempotency UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS inventory_tx_tenant_occurred_idx
  ON ledger.inventory_transactions (tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS inventory_tx_tenant_lot_idx
  ON ledger.inventory_transactions (tenant_id, lot_code, occurred_at DESC);

CREATE INDEX IF NOT EXISTS inventory_tx_tenant_document_idx
  ON ledger.inventory_transactions (tenant_id, document_ref);

ALTER TABLE ledger.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger.inventory_transactions FORCE ROW LEVEL SECURITY;

CREATE POLICY inventory_tx_tenant_isolation ON ledger.inventory_transactions
  FOR ALL
  USING (
    current_setting('app.rls_bypass', true) = '1'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.rls_bypass', true) = '1'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

CREATE OR REPLACE FUNCTION ledger.deny_inventory_tx_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'inventory_transactions is append-only';
END;
$$;

DROP TRIGGER IF EXISTS inventory_tx_no_mutation ON ledger.inventory_transactions;
CREATE TRIGGER inventory_tx_no_mutation
  BEFORE UPDATE OR DELETE ON ledger.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION ledger.deny_inventory_tx_mutation();

REVOKE ALL ON TABLE ledger.inventory_transactions FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE ledger.inventory_transactions TO PUBLIC;

INSERT INTO schema_migrations (version) VALUES ('006_inventory_ledger')
ON CONFLICT DO NOTHING;
