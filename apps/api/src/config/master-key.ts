import { deriveEnvelopeMasterKey } from "../crypto/envelope.js";
import { getRuntimePool, readInstallMeta } from "../db/pool.js";

export async function loadEnvelopeMasterKey(): Promise<Buffer> {
  const pool = getRuntimePool();
  if (!pool) {
    throw new Error("DATABASE_UNAVAILABLE");
  }
  const meta = await readInstallMeta(pool);
  if (!meta?.install_lock) {
    throw new Error("NOT_INSTALLED");
  }
  return deriveEnvelopeMasterKey(meta.envelope_salt, meta.server_secret);
}
