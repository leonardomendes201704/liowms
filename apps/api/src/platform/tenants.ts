import type { PlatformTenant } from "@liowms/shared";
import { withDbScope } from "../db/tenant-scope.js";

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  is_root: boolean;
  created_at: Date;
}

function mapTenant(row: TenantRow): PlatformTenant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isRoot: row.is_root,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listTenants(): Promise<PlatformTenant[]> {
  return withDbScope({ bypassRls: true }, async (client) => {
    const res = await client.query<TenantRow>(
      `SELECT id, slug, name, is_root, created_at FROM tenants ORDER BY created_at`,
    );
    return res.rows.map(mapTenant);
  });
}

export async function createTenant(input: {
  slug: string;
  name: string;
}): Promise<PlatformTenant> {
  const slug = input.slug.trim().toLowerCase();
  const name = input.name.trim();
  return withDbScope({ bypassRls: true }, async (client) => {
    const res = await client.query<TenantRow>(
      `INSERT INTO tenants (slug, name, is_root)
       VALUES ($1, $2, false)
       RETURNING id, slug, name, is_root, created_at`,
      [slug, name],
    );
    return mapTenant(res.rows[0]);
  });
}
