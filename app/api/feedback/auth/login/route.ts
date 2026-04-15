import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { basePrisma } from "@/lib/db";
import { signFeedbackToken } from "@/lib/feedback-auth";
import { firstZodError } from "@/lib/validation/project-schema";
import { buildCorsHeaders, isAllowedOrigin } from "@/lib/cors";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Password obrigatória"),
});

// Hash dummy usado em timing-safe path quando o user não existe — evita
// distinguir "email inexistente" vs "password errada" via tempo de resposta.
const DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuvCe1NQXt0Eh8EJg0VG/ddNOJQ.aeHKkyq";

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: "Origin não permitida" }, { status: 403 });
  }
  const corsHeaders = buildCorsHeaders(origin);

  const ip = getClientIp(request);
  const rl = checkRateLimit(`feedback-login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas tentativas. Tenta novamente em 15 minutos." },
      { status: 429, headers: corsHeaders }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: corsHeaders });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error) },
      { status: 400, headers: corsHeaders }
    );
  }

  const { email, password } = parsed.data;

  // User lookup uses basePrisma (cross-tenant, before session exists)
  const user = await basePrisma.user.findFirst({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      isActive: true,
      tenantId: true,
      person: { select: { name: true } },
    },
  });

  // Sempre fazer bcrypt.compare (mesmo sem user) para tempo constante.
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.isActive || !valid) {
    return NextResponse.json(
      { error: "Credenciais inválidas." },
      { status: 401, headers: corsHeaders }
    );
  }

  const { token, expiresAt } = await signFeedbackToken({
    userId: user.id,
    email: user.email,
    name: user.person.name,
    tenantId: user.tenantId,
  });

  return NextResponse.json(
    {
      token,
      expiresAt,
      email: user.email,
      name: user.person.name,
    },
    { status: 200, headers: corsHeaders }
  );
}
