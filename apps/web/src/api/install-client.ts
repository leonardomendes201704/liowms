import {
  INSTALL_HTTP,
  type HealthResponseH4,
  type InstallErrorBody,
} from "@liowms/shared";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error("Resposta vazia do servidor");
  }
  return JSON.parse(text) as T;
}

export async function fetchHealth(): Promise<HealthResponseH4> {
  const res = await fetch("/health");
  if (!res.ok) {
    throw new Error(`Health indisponível (${res.status})`);
  }
  return readJson<HealthResponseH4>(res);
}

export async function testDsn(dsn: string): Promise<{ ok: true } | InstallErrorBody> {
  const res = await fetch(INSTALL_HTTP.testDsn, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dsn }),
  });
  if (res.ok) {
    return { ok: true };
  }
  return readJson<InstallErrorBody>(res);
}

export interface CompleteInstallPayload {
  dsn: string;
  locale: string;
  timezone: string;
  instanceUrl: string;
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

export interface CompleteInstallSuccess {
  ok: true;
  redirect: string;
  installLock: boolean;
}

export async function completeInstall(
  payload: CompleteInstallPayload,
): Promise<CompleteInstallSuccess | InstallErrorBody> {
  const res = await fetch(INSTALL_HTTP.complete, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) {
    return readJson<CompleteInstallSuccess>(res);
  }
  return readJson<InstallErrorBody>(res);
}
