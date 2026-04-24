import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Extrai o token de um header `Authorization: Bearer <token>`.
 * Devolve o token (trimmed) ou uma resposta 401 pronta a retornar.
 */
export function extractBearerToken(
  request: NextRequest,
): { token: string } | NextResponse {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing Authorization: Bearer <token>" },
      { status: 401 },
    );
  }
  const token = auth.slice(7).trim();
  if (!token) {
    return NextResponse.json({ error: "Empty token" }, { status: 401 });
  }
  return { token };
}
