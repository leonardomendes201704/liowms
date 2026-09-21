import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

export function signSessionJwt(
  userId: string,
  secret: Buffer,
  tenantId?: string,
): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, string | number> = {
    sub: userId,
    exp: now + SESSION_TTL_SECONDS,
    iat: now,
  };
  if (tenantId) {
    claims.tid = tenantId;
  }
  const payload = base64url(JSON.stringify(claims));
  const sig = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export function verifySessionJwt(
  token: string,
  secret: Buffer,
): { userId: string; tenantId?: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [header, payload, sig] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const body = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { sub?: string; exp?: number; tid?: string };
    if (!body.sub || typeof body.exp !== "number") {
      return null;
    }
    if (body.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return {
      userId: body.sub,
      tenantId: typeof body.tid === "string" ? body.tid : undefined,
    };
  } catch {
    return null;
  }
}

export { SESSION_TTL_SECONDS };
