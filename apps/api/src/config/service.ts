import {
  KNOWN_SECRET_SETTING_KEYS,
  SECRET_MASK,
  SMTP_PLAIN_KEYS,
  type TenantSettingEntry,
  type TenantSettingsPatchBody,
} from "@liowms/shared";
import type { PoolClient } from "pg";
import { appendAuditEvent } from "../audit/writer.js";
import { settingsEntriesToAuditMap } from "../audit/redact.js";
import { openValue, sealValue } from "../crypto/envelope.js";
import { withDbScope } from "../db/tenant-scope.js";
import { safeLog } from "../logging.js";
import { enqueueNotifyOutbox } from "../notify/service.js";
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
  await enqueueNotifyOutbox({
    kind: "smtp_config_saved",
    tenantId,
    skipDelivery: true,
    payload: {
      tenantId,
      note: "SMTP envelope persisted",
    },
  });
  safeLog("info", "smtp_config_saved", { tenantId });
}

async function loadTenantSettingsEntries(
  client: PoolClient,
  tenantId: string,
): Promise<TenantSettingEntry[]> {
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
}

export async function getTenantSettings(
  tenantId: string,
): Promise<TenantSettingEntry[]> {
  return withDbScope({ tenantId }, async (client) =>
    loadTenantSettingsEntries(client, tenantId),
  );
}

function buildConfigPatchAuditJson(
  beforeMap: Record<string, unknown>,
  afterMap: Record<string, unknown>,
  body: TenantSettingsPatchBody,
): { beforeJson: Record<string, unknown>; afterJson: Record<string, unknown> } {
  const beforeJson: Record<string, unknown> = {};
  const afterJson: Record<string, unknown> = {};
  const keys = new Set<string>();
  if (body.plain) {
    for (const key of Object.keys(body.plain)) {
      keys.add(key);
    }
  }
  if (body.secrets) {
    for (const key of Object.keys(body.secrets)) {
      keys.add(key);
    }
  }
  for (const key of keys) {
    beforeJson[key] = beforeMap[key] ?? null;
    if (body.secrets && key in body.secrets) {
      afterJson[key] = SECRET_MASK;
    } else {
      afterJson[key] = afterMap[key] ?? null;
    }
  }
  return { beforeJson, afterJson };
}

export interface PatchTenantSettingsOptions {
  actorUserId?: string;
}

export async function patchTenantSettings(
  tenantId: string,
  body: TenantSettingsPatchBody,
  options?: PatchTenantSettingsOptions,
): Promise<TenantSettingEntry[]> {
  const masterKey = await loadEnvelopeMasterKey();
  let smtpTouched = false;
  const hasPatch =
    (body.plain && Object.keys(body.plain).length > 0) ||
    (body.secrets && Object.keys(body.secrets).length > 0);

  await withDbScope({ tenantId }, async (client) => {
    const beforeEntries = hasPatch
      ? await loadTenantSettingsEntries(client, tenantId)
      : [];
    const beforeMap = settingsEntriesToAuditMap(beforeEntries);

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

    if (hasPatch && options?.actorUserId) {
      const afterEntries = await loadTenantSettingsEntries(client, tenantId);
      const afterMap = settingsEntriesToAuditMap(afterEntries);
      const { beforeJson, afterJson } = buildConfigPatchAuditJson(
        beforeMap,
        afterMap,
        body,
      );
      await appendAuditEvent(client, {
        tenantId,
        actorUserId: options.actorUserId,
        action: "update",
        entityType: "config_setting",
        entityKey: "tenant.settings",
        beforeJson,
        afterJson,
      });
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
