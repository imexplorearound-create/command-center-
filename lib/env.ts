import crypto from "crypto";

let cachedKey: Buffer | null = null;

/**
 * Devolve a chave AES-256 derivada de APP_SECRET via SHA-256.
 * SHA-256 preserva a entropia completa do secret (ao contrário de `slice(0,32)`
 * que, com input hex, só aproveitava metade).
 */
export function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "APP_SECRET em falta ou demasiado curto (mínimo 32 chars). " +
        'Gera um com: `openssl rand -hex 32` e coloca em .env.local como APP_SECRET="..."'
    );
  }

  cachedKey = crypto.createHash("sha256").update(secret).digest();
  return cachedKey;
}
