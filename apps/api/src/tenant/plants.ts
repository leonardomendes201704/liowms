import type { TenantPlant } from "@liowms/shared";
import { withDbScope } from "../db/tenant-scope.js";

interface PlantRow {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  created_at: Date;
}

function mapPlant(row: PlantRow): TenantPlant {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    slug: row.slug,
    name: row.name,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listPlants(tenantId: string): Promise<TenantPlant[]> {
  return withDbScope({ tenantId }, async (client) => {
    const res = await client.query<PlantRow>(
      `SELECT id, tenant_id, slug, name, created_at
       FROM plants WHERE tenant_id = $1 ORDER BY created_at`,
      [tenantId],
    );
    return res.rows.map(mapPlant);
  });
}

export async function createPlant(
  tenantId: string,
  input: { slug: string; name: string },
): Promise<TenantPlant> {
  const slug = input.slug.trim().toLowerCase();
  const name = input.name.trim();
  return withDbScope({ tenantId }, async (client) => {
    const res = await client.query<PlantRow>(
      `INSERT INTO plants (tenant_id, slug, name)
       VALUES ($1, $2, $3)
       RETURNING id, tenant_id, slug, name, created_at`,
      [tenantId, slug, name],
    );
    return mapPlant(res.rows[0]);
  });
}

export async function getPlantById(
  tenantId: string,
  plantId: string,
): Promise<TenantPlant | null> {
  return withDbScope({ tenantId }, async (client) => {
    const res = await client.query<PlantRow>(
      `SELECT id, tenant_id, slug, name, created_at
       FROM plants WHERE id = $1`,
      [plantId],
    );
    const row = res.rows[0];
    return row ? mapPlant(row) : null;
  });
}

export async function getPlantTenantId(plantId: string): Promise<string | null> {
  return withDbScope({ bypassRls: true }, async (client) => {
    const res = await client.query<{ tenant_id: string }>(
      `SELECT tenant_id FROM plants WHERE id = $1`,
      [plantId],
    );
    return res.rows[0]?.tenant_id ?? null;
  });
}

export async function updatePlant(
  tenantId: string,
  plantId: string,
  input: { name?: string },
): Promise<TenantPlant | null> {
  const name = input.name?.trim();
  if (!name) {
    return getPlantById(tenantId, plantId);
  }
  return withDbScope({ tenantId }, async (client) => {
    const res = await client.query<PlantRow>(
      `UPDATE plants SET name = $3
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, tenant_id, slug, name, created_at`,
      [plantId, tenantId, name],
    );
    const row = res.rows[0];
    return row ? mapPlant(row) : null;
  });
}
