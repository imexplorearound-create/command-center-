import { SignJWT, jwtVerify } from "jose";
import { getBaseUrl } from "@/lib/feedback-utils";

const HANDOFF_ASSET_TOKEN_TYPE = "handoff-asset";
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

function getHandoffSecretKey(): Uint8Array {
  const secret = process.env.HANDOFF_ASSET_SECRET;
  if (!secret) throw new Error("HANDOFF_ASSET_SECRET not set");
  return new TextEncoder().encode(secret);
}

export async function signAssetUrl(
  relativePath: string,
  ttlSec = DEFAULT_TTL_SECONDS
): Promise<string> {
  const token = await new SignJWT({ path: relativePath, type: HANDOFF_ASSET_TOKEN_TYPE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(getHandoffSecretKey());
  return `${getBaseUrl()}/api/handoff-asset?t=${token}`;
}

export async function verifyAssetToken(
  token: string
): Promise<{ path: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getHandoffSecretKey());
    if (payload.type !== HANDOFF_ASSET_TOKEN_TYPE) return null;
    if (typeof payload.path !== "string") return null;
    return { path: payload.path };
  } catch {
    return null;
  }
}
