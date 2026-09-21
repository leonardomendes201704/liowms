import type {
  AuthErrorBody,
  TenantPlantCreateBody,
  TenantPlantCreateResponse,
  TenantPlantsListResponse,
} from "@liowms/shared";
import { tenantPlantsPath } from "@liowms/shared";

const jsonOpts: RequestInit = {
  credentials: "include",
  headers: { "Content-Type": "application/json" },
};

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error("Resposta vazia do servidor");
  }
  return JSON.parse(text) as T;
}

export async function listTenantPlants(
  tenantId: string,
): Promise<TenantPlantsListResponse | AuthErrorBody> {
  const res = await fetch(tenantPlantsPath(tenantId), {
    credentials: "include",
  });
  return readJson(res);
}

export async function createTenantPlant(
  tenantId: string,
  body: TenantPlantCreateBody,
): Promise<TenantPlantCreateResponse | AuthErrorBody> {
  const res = await fetch(tenantPlantsPath(tenantId), {
    ...jsonOpts,
    method: "POST",
    body: JSON.stringify(body),
  });
  return readJson(res);
}
