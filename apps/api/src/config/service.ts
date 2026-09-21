import {
  KNOWN_SECRET_SETTING_KEYS,
  SECRET_MASK,
  SMTP_PLAIN_KEYS,
  type TenantSettingEntry,
  type TenantSettingsPatchBody,
} from "@liowms/shared";
import { openValue, sealValue } from "../crypto/envelope.js";
import { withDbScope } from "../db/tenant-scope.js";
import { safeLog } from "../logging.js";
import { loadEnvelopeMasterKey } from "./master-key.js";

const SMTP_KEYS = new Set<string>([
  SMTP_PLAIN_KEYS.host,
  SMTP_PLAIN_KEYS.port,
  SMTP_PLAIN_KEYS.user,
  SMTP_PLAIN_KEYS.from,
  ...KNOWN_SECRET_SETTING_KEYS,
]);

function isKnownSecretKey(key: string): boolean {
  return KNOWN_SECRET_SETTING_KEYS.includes(key);
}

async function enqueueSmtpConfigStub(tenantId: string): Promise<void> {
  await withDbScope({ bypassRls: true }, async (client) => {
    await client.query(
      `INSERT INTO notify_outbox (kind, payload) VALUES ($1, $2::jsonb)`,
      [
        "smtp_config_saved",
        JSON.stringify({
          tenantId,
          note: "SMTP envelope persisted; delivery deferred S0.7",
        }),
      ],
    );
  });
  safeLog("info", "smtp_config_saved", { tenantId });
}

export async function getTenantSettings(
  tenantId: string,
): Promise<TenantSettingEntry[]> {
  return withDbScope({ tenantId }, async (client) => {
    const plainRes = await client.query<{ key: string; value_json: unknown }>(
      `SELECT key, value_json FROM config_settings WHERE tenant_id = $1 ORDER BY key`,
      [tenantId],
    );
    const secretRes = await client.query<{ key: string }>(
      `SELECT key FROM config_secrets
       WHERE tenant_id = $1 AND key <> 'envelope.bootstrap'
       ORDER BY key`,
      [tenantId],
    );

    const entries: TenantSettingEntry[] = plainRes.rows.map((row) => ({
      key: row.key,
      kind: "plain" as const,
      value: row.value_json,
    }));

    for (const row of secretRes.rows) {
      entries.push({
        key: row.key,
        kind: "secret",
        display: SECRET_MASK,
        set: true,
      });
    }

    for (const key of KNOWN_SECRET_SETTING_KEYS) {
      if (!secretRes.rows.some((r) => r.key === key)) {
        entries.push({
          key,
          kind: "secret",
          display: SECRET_MASK,
          set: false,
        });
      }
    }

    entries.sort((a, b) => a.key.localeCompare(b.key));
    return entries;
  });
}

export async function patchTenantSettings(
  tenantId: string,
  body: TenantSettingsPatchBody,
): Promise<TenantSettingEntry[]> {
  const masterKey = await loadEnvelopeMasterKey();
  let smtpTouched = false;

  await withDbScope({ tenantId }, async (client) => {
    if (body.plain) {
      for (const [key, value] of Object.entries(body.plain)) {
        if (isKnownSecretKey(key)) {
          throw new Error(`INVALID_KEY:${key}`);
        }
        await client.query(
          `INSERT INTO config_settings (tenant_id, key, value_json, updated_at)
           VALUES ($1, $2, $3::jsonb, now())
           ON CONFLICT (tenant_id, key) DO UPDATE SET
             value_json = EXCLUDED.value_json,
             updated_at = now()`,
          [tenantId, key, JSON.stringify(value)],
        );
        if (SMTP_KEYS.has(key)) {
          smtpTouched = true;
        }
      }
    }

    if (body.secrets) {
      for (const [key, value] of Object.entries(body.secrets)) {
        if (!isKnownSecretKey(key)) {
          throw new Error(`INVALID_SECRET_KEY:${key}`);
        }
        if (!value || value.length === 0) {
          throw new Error(`EMPTY_SECRET:${key}`);
        }
        const blob = sealValue(value, masterKey);
        await client.query(
          `INSERT INTO config_secrets (
             tenant_id, key, ciphertext, iv, tag, dek_wrapped, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, now())
           ON CONFLICT (tenant_id, key) DO UPDATE SET
             ciphertext = EXCLUDED.ciphertext,
             iv = EXCLUDED.iv,
             tag = EXCLUDED.tag,
             dek_wrapped = EXCLUDED.dek_wrapped,
             updated_at = now()`,
          [
            tenantId,
            key,
            blob.ciphertext,
            blob.iv,
            blob.tag,
            blob.dekWrapped,
          ],
        );
        smtpTouched = true;
      }
    }
  });

  if (smtpTouched) {
    await enqueueSmtpConfigStub(tenantId);
  }

  return getTenantSettings(tenantId);
}

/** Internal read for workers (S0.7); not exposed via HTTP. */
export async function readTenantSecretPlaintext(
  tenantId: string,
  key: string,
): Promise<string | null> {
  if (!isKnownSecretKey(key)) {
    return null;
  }
  const masterKey = await loadEnvelopeMasterKey();
  return withDbScope({ tenantId }, async (client) => {
    const res = await client.query<{
      ciphertext: Buffer;
      iv: Buffer;
      tag: Buffer;
      dek_wrapped: Buffer;
    }>(
      `SELECT ciphertext, iv, tag, dek_wrapped FROM config_secrets
       WHERE tenant_id = $1 AND key = $2`,
      [tenantId, key],
    );
    const row = res.rows[0];
    if (!row) {
      return null;
    }
    return openValue(
      {
        ciphertext: row.ciphertext,
        iv: row.iv,
        tag: row.tag,
        dekWrapped: row.dek_wrapped,
      },
      masterKey,
    );
  });
}
