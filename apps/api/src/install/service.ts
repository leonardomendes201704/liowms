import { createHash } from "node:crypto";
import { hashPassword } from "../auth/password.js";
import {
  INSTALL_ERROR_ALREADY_DONE,
  INSTALL_ERROR_INVALID_DSN,
  INSTALL_ERROR_MIGRATION_FAILED,
} from "@liowms/shared";
import {
  deriveEnvelopeMasterKey,
  generateInstallSalt,
  generateServerSecret,
  sealValue,
} from "../crypto/envelope.js";
import { createPool, setRuntimePool, testDsn } from "../db/pool.js";
import { safeLog } from "../logging.js";
import { runMigrations } from "./migrations/index.js";
import { isInstalling, markInstalling } from "./state.js";

export interface InstallCompleteInput {
  dsn: string;
  locale: string;
  timezone: string;
  instanceUrl?: string;
  admin: {
    email: string;
    password: string;
    displayName: string;
  };
  tenant: {
    slug: string;
    name: string;
  };
}

export async function testInstallDsn(dsn: string) {
  if (!dsn || !dsn.startsWith("postgres")) {
    return {
      ok: false as const,
      code: INSTALL_ERROR_INVALID_DSN,
      message: "DSN Postgres inválido",
    };
  }
  const result = await testDsn(dsn);
  if (!result.ok) {
    return {
      ok: false as const,
      code: INSTALL_ERROR_INVALID_DSN,
      message: result.message,
    };
  }
  return { ok: true as const };
}

export async function completeInstall(input: InstallCompleteInput) {
  if (isInstalling()) {
    return {
      ok: false as const,
      code: INSTALL_ERROR_MIGRATION_FAILED,
      message: "Instalação já em andamento",
    };
  }

  const dsnCheck = await testInstallDsn(input.dsn);
  if (!dsnCheck.ok) {
    return dsnCheck;
  }

  const pool = createPool(input.dsn);
  markInstalling(true);

  const client = await pool.connect();
  let committed = false;
  try {
    await client.query("BEGIN");

    const lockProbe = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'install_meta'",
    );
    if (lockProbe.rowCount) {
      const locked = await client.query<{ install_lock: boolean }>(
        "SELECT install_lock FROM install_meta WHERE id = 1",
      );
      if (locked.rows[0]?.install_lock) {
        await client.query("ROLLBACK");
        return {
          ok: false as const,
          code: INSTALL_ERROR_ALREADY_DONE,
          message: "Instância já instalada",
        };
      }
    }

    await runMigrations(client);

    const serverSecret = generateServerSecret();
    const envelopeSalt = generateInstallSalt();
    const masterKey = deriveEnvelopeMasterKey(envelopeSalt, serverSecret);
    const dsnBlob = sealValue(input.dsn, masterKey);

    const passwordHash = hashPassword(input.admin.password);

    await client.query(
      `INSERT INTO install_meta (
        id, install_lock, installed_at, server_secret, envelope_salt,
        dsn_ciphertext, dsn_iv, dsn_tag, dsn_dek_wrapped,
        locale, timezone, instance_url
      ) VALUES (
        1, true, now(), $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      ON CONFLICT (id) DO UPDATE SET
        install_lock = EXCLUDED.install_lock,
        installed_at = EXCLUDED.installed_at,
        server_secret = EXCLUDED.server_secret,
        envelope_salt = EXCLUDED.envelope_salt,
        dsn_ciphertext = EXCLUDED.dsn_ciphertext,
        dsn_iv = EXCLUDED.dsn_iv,
        dsn_tag = EXCLUDED.dsn_tag,
        dsn_dek_wrapped = EXCLUDED.dsn_dek_wrapped,
        locale = EXCLUDED.locale,
        timezone = EXCLUDED.timezone,
        instance_url = EXCLUDED.instance_url`,
      [
        serverSecret,
        envelopeSalt,
        dsnBlob.ciphertext,
        dsnBlob.iv,
        dsnBlob.tag,
        dsnBlob.dekWrapped,
        input.locale,
        input.timezone,
        input.instanceUrl ?? null,
      ],
    );

    const tenantRes = await client.query<{ id: string }>(
      `INSERT INTO tenants (slug, name, is_root)
       VALUES ($1, $2, true)
       RETURNING id`,
      [input.tenant.slug, input.tenant.name],
    );
    const tenantId = tenantRes.rows[0].id;

    await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);

    await client.query(
      `INSERT INTO platform_users (email, display_name, password_hash, is_super_admin)
       VALUES ($1, $2, $3, true)`,
      [input.admin.email, input.admin.displayName, passwordHash],
    );

    const placeholder = sealValue("envelope-ready", masterKey);
    await client.query(
      `INSERT INTO config_secrets (tenant_id, key, ciphertext, iv, tag, dek_wrapped)
       VALUES ($1, 'envelope.bootstrap', $2, $3, $4, $5)`,
      [
        tenantId,
        placeholder.ciphertext,
        placeholder.iv,
        placeholder.tag,
        placeholder.dekWrapped,
      ],
    );

    await client.query("COMMIT");
    committed = true;

    setRuntimePool(pool);
    safeLog("info", "install_complete", {
      tenant: input.tenant.slug,
      migration: createHash("sha256").update("001").digest("hex").slice(0, 8),
    });

    return {
      ok: true as const,
      tenantId,
      redirect: "/login",
    };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* connection may already be aborted */
    }
    const message =
      err instanceof Error ? err.message : "Falha na instalação";
    safeLog("error", "install_failed", { message });
    return {
      ok: false as const,
      code: INSTALL_ERROR_MIGRATION_FAILED,
      message,
    };
  } finally {
    client.release();
    markInstalling(false);
    if (!committed) {
      await pool.end();
    }
  }
}
