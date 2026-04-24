import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { firstZodError } from "@/lib/validation/project-schema";

/**
 * Parse JSON body + valida contra Zod schema. Devolve data válida ou
 * NextResponse pronta a retornar (400 inválido / JSON mal-formado).
 */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T,
): Promise<z.infer<T> | NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }
  return parsed.data;
}

/**
 * Converte P2002 (unique constraint violation) numa 409 com mensagem amigável.
 * Re-lança outros erros para o handler global.
 */
export function handleUniqueViolation(error: unknown, message: string): NextResponse {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: message }, { status: 409 });
  }
  throw error;
}
