import type { PlatformTenant } from "@liowms/shared";
import { appendAuditEvent } from "../audit/writer.js";
import { withDbScope } from "../db/tenant-scope.js";

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  is_root: boolean;
  quota_users: number | null;
  deactivated_at: Date | null;
  created_at: Date;
}

function mapTenant(row: TenantRow): PlatformTenant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isRoot: row.is_root,
    quotaUsers: row.quota_users,
    deactivatedAt: row.deactivated_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

const tenantSelect = `id, slug, name, is_root, quota_users, deactivated_at, created_at`;

export async function listTenants(): Promise<PlatformTenant[]> {
  return withDbScope({ bypassRls: true }, async (client) => {
    const res = await client.query<TenantRow>(
      `SELECT ${tenantSelect} FROM tenants ORDER BY created_at`,
    );
    return res.rows.map(mapTenant);
  });
}

export async function getTenantById(
  tenantId: string,
): Promise<PlatformTenant | null> {
  return withDbScope({ bypassRls: true }, async (client) => {
    const res = await client.query<TenantRow>(
      `SELECT ${tenantSelect} FROM tenants WHERE id = $1`,
      [tenantId],
    );
    const row = res.rows[0];
    return row ? mapTenant(row) : null;
  });
}

export async function isTenantActive(tenantId: string): Promise<boolean> {
  return withDbScope({ bypassRls: true }, async (client) => {
    const res = await client.query<{ deactivated_at: Date | null }>(
      `SELECT deactivated_at FROM tenants WHERE id = $1`,
      [tenantId],
    );
    const row = res.rows[0];
    if (!row) {
      return false;
    }
    return row.deactivated_at === null;
  });
}

function normalizeQuota(quotaUsers: number | undefined): number | null {
  if (quotaUsers === undefined) {
    return null;
  }
  if (!Number.isFinite(quotaUsers) || quotaUsers < 1) {
    throw new Error("quota_users_invalid");
  }
  return Math.floor(quotaUsers);
}

export async function createTenant(input: {
  slug: string;
  name: string;
  quotaUsers?: number;
}): Promise<PlatformTenant> {
  const slug = input.slug.trim().toLowerCase();
  const name = input.name.trim();
  const quotaUsers = normalizeQuota(input.quotaUsers);
  return withDbScope({ bypassRls: true }, async (client) => {
    const res = await client.query<TenantRow>(
      `INSERT INTO tenants (slug, name, is_root, quota_users)
       VALUES ($1, $2, false, $3)
       RETURNING ${tenantSelect}`,
      [slug, name, quotaUsers],
    );
    return mapTenant(res.rows[0]);
  });
}

export async function updateTenantQuota(
  tenantId: string,
  quotaUsers: number,
): Promise<PlatformTenant | null> {
  const quota = normalizeQuota(quotaUsers);
  return withDbScope({ bypassRls: true }, async (client) => {
    const res = await client.query<TenantRow>(
      `UPDATE tenants SET quota_users = $2
       WHERE id = $1 AND is_root = false AND deactivated_at IS NULL
       RETURNING ${tenantSelect}`,
      [tenantId, quota],
    );
    const row = res.rows[0];
    return row ? mapTenant(row) : null;
  });
}

export async function offboardTenant(input: {
  tenantId: string;
  actorUserId: string;
}): Promise<
  | { ok: true; tenant: PlatformTenant; sessionsRevoked: number }
  | { ok: false; code: string; message: string }
> {
  return withDbScope({ bypassRls: true }, async (client) => {
    await client.query("BEGIN");
    try {
      const existing = await client.query<TenantRow>(
        `SELECT ${tenantSelect} FROM tenants WHERE id = $1 FOR UPDATE`,
        [input.tenantId],
      );
      const row = existing.rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        return { ok: false, code: "not_found", message: "Tenant não encontrado" };
      }
      if (row.is_root) {
        await client.query("ROLLBACK");
        return {
          ok: false,
          code: "forbidden",
          message: "Não é permitido desativar o tenant raiz",
        };
      }
      if (row.deactivated_at) {
        await client.query("ROLLBACK");
        return {
          ok: false,
          code: "already_offboarded",
          message: "Tenant já está desativado",
        };
      }

      const before = mapTenant(row);
      const updated = await client.query<TenantRow>(
        `UPDATE tenants SET deactivated_at = now()
         WHERE id = $1
         RETURNING ${tenantSelect}`,
        [input.tenantId],
      );
      const tenant = mapTenant(updated.rows[0]);

      const revoked = await client.query(
        `DELETE FROM user_sessions
         WHERE user_id IN (
           SELECT user_id FROM tenant_memberships WHERE tenant_id = $1
         )`,
        [input.tenantId],
      );

      await appendAuditEvent(client, {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        action: "tenant.offboard",
        entityType: "tenant",
        entityKey: input.tenantId,
        beforeJson: {
          slug: before.slug,
          name: before.name,
          quotaUsers: before.quotaUsers,
          deactivatedAt: before.deactivatedAt,
        },
        afterJson: {
          slug: tenant.slug,
          name: tenant.name,
          quotaUsers: tenant.quotaUsers,
          deactivatedAt: tenant.deactivatedAt,
          sessionsRevoked: revoked.rowCount ?? 0,
        },
      });

      await client.query("COMMIT");
      return {
        ok: true,
        tenant,
        sessionsRevoked: revoked.rowCount ?? 0,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  });
}
