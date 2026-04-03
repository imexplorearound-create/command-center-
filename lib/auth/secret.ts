const cachedKey: { value: Uint8Array | null } = { value: null };

export function getSecretKey(): Uint8Array {
  if (cachedKey.value) return cachedKey.value;
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET not set");
  cachedKey.value = new TextEncoder().encode(secret);
  return cachedKey.value;
}
