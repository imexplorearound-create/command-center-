import crypto from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { basePrisma } from "@/lib/db";
import { extractBearerToken } from "@/lib/auth/bearer";

const TOKEN_PREFIX = "cc_dev_";
const TOKEN_SECRET_BYTES = 24;
const TOKEN_PREFIX_DISPLAY_LEN = 16;
const LAST_USED_THROTTLE_MS = 60_000;

export type DevApiKeyScope =
  | "testsheets:read"
  | "testsheets:write"
  | "tasks:read"
  | "tasks:write"
  | "feedback:read";

export type DevApiKeyContext = {
  keyId: string;
  tenantId: string;
  personId: string | null;
  scopes: string[];
};

function getPepper(): string {
  const pepper = process.env.DEV_API_KEY_PEPPER;
  if (!pepper) {
    throw new Error("DEV_API_KEY_PEPPER is not configured");
  }
  return pepper;
}

export function generateDevApiKey(): { token: string; prefix: string } {
  const secret = crypto.randomBytes(TOKEN_SECRET_BYTES).toString("hex");
  const token = `${TOKEN_PREFIX}${secret}`;
  return { token, prefix: token.slice(0, TOKEN_PREFIX_DISPLAY_LEN) };
}

export function hashDevApiKey(token: string): string {
  return crypto
    .createHash("sha256")
    .update(getPepper())
    .update(token)
    .digest("hex");
}

export async function authenticateDev(
  request: NextRequest,
  required: { scopes?: DevApiKeyScope[] } = {},
): Promise<DevApiKeyContext | NextResponse> {
  const bearer = extractBearerToken(request);
  if (bearer instanceof NextResponse) return bearer;
  const { token } = bearer;

  if (!token.startsWith(TOKEN_PREFIX)) {
    return NextResponse.json({ error: "Invalid token format" }, { status: 401 });
  }

  let tokenHash: string;
  try {
    tokenHash = hashDevApiKey(token);
  } catch {
    return NextResponse.json(
      { error: "DEV_API_KEY_PEPPER not configured" },
      { status: 500 },
    );
  }

  const key = await basePrisma.devApiKey.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      tenantId: true,
      personId: true,
      scopes: true,
      revokedAt: true,
      expiresAt: true,
      lastUsedAt: true,
    },
  });

  if (!key) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  if (key.revokedAt) {
    return NextResponse.json({ error: "Token revoked" }, { status: 401 });
  }
  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  const requiredScopes = required.scopes ?? [];
  if (requiredScopes.length > 0) {
    const missing = requiredScopes.filter((s) => !key.scopes.includes(s));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing scopes: ${missing.join(", ")}` },
        { status: 403 },
      );
    }
  }

  // Evita escrever `lastUsedAt` em cada request — granularidade de 60s é
  // suficiente para observabilidade e elimina write-contention sob carga
  // concorrente na mesma key.
  const lastUsedMs = key.lastUsedAt?.getTime() ?? 0;
  if (Date.now() - lastUsedMs > LAST_USED_THROTTLE_MS) {
    basePrisma.devApiKey
      .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
      .catch((err) => {
        console.warn("[devApiKey] lastUsedAt update failed", { keyId: key.id, err });
      });
  }

  return {
    keyId: key.id,
    tenantId: key.tenantId,
    personId: key.personId,
    scopes: key.scopes,
  };
}
