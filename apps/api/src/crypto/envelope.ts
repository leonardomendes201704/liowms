import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;

/** ADR-004: derive envelope master key material at install (not exported via API). */
export function deriveEnvelopeMasterKey(
  installSalt: Buffer,
  serverSecret: Buffer,
): Buffer {
  return scryptSync(serverSecret, installSalt, KEY_LEN);
}

export function generateServerSecret(): Buffer {
  return randomBytes(32);
}

export function generateInstallSalt(): Buffer {
  return randomBytes(16);
}

export interface EnvelopeBlob {
  ciphertext: Buffer;
  iv: Buffer;
  tag: Buffer;
  dekWrapped: Buffer;
}

export function sealValue(plaintext: string, masterKey: Buffer): EnvelopeBlob {
  const dek = randomBytes(KEY_LEN);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, dek, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const wrapIv = randomBytes(IV_LEN);
  const wrapCipher = createCipheriv(ALGO, masterKey, wrapIv);
  const dekWrapped = Buffer.concat([
    wrapCipher.update(dek),
    wrapCipher.final(),
    wrapCipher.getAuthTag(),
  ]);

  return { ciphertext: enc, iv, tag, dekWrapped: Buffer.concat([wrapIv, dekWrapped]) };
}

export function openValue(blob: EnvelopeBlob, masterKey: Buffer): string {
  const wrapIv = blob.dekWrapped.subarray(0, IV_LEN);
  const wrapped = blob.dekWrapped.subarray(IV_LEN);
  const wrapTag = wrapped.subarray(wrapped.length - TAG_LEN);
  const wrapBody = wrapped.subarray(0, wrapped.length - TAG_LEN);
  const unwrap = createDecipheriv(ALGO, masterKey, wrapIv);
  unwrap.setAuthTag(wrapTag);
  const dek = Buffer.concat([unwrap.update(wrapBody), unwrap.final()]);

  const decipher = createDecipheriv(ALGO, dek, blob.iv);
  decipher.setAuthTag(blob.tag);
  return Buffer.concat([
    decipher.update(blob.ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
