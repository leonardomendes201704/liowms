-- S0.7: outbox delivery state + DLQ (WMS-106 / notify module)

ALTER TABLE notify_outbox
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS dlq_at TIMESTAMPTZ;

UPDATE notify_outbox
SET status = 'sent'
WHERE processed_at IS NOT NULL AND status = 'pending';

UPDATE notify_outbox
SET status = 'skipped'
WHERE kind = 'smtp_config_saved' AND status = 'pending' AND processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notify_outbox_worker
  ON notify_outbox (next_attempt_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_notify_outbox_tenant_status
  ON notify_outbox (tenant_id, status, created_at DESC);

INSERT INTO schema_migrations (version) VALUES ('007_notify_outbox_s07')
ON CONFLICT DO NOTHING;
