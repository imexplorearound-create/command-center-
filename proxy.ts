import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getSecretKey } from "@/lib/auth/secret";

const PUBLIC_PATHS = ["/login", "/_next", "/favicon.ico", "/api/webhooks", "/api/sync"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("cc_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const role = payload.role as string;

    // Role-based route restrictions
    if (role === "cliente") {
      // Clients can only access /project/*/client paths
      const isClientHub = /^\/project\/[^/]+\/client/.test(pathname);
      if (!isClientHub && pathname !== "/") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    // Pass user info to server components via headers
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.userId as string);
    response.headers.set("x-user-role", role);
    response.headers.set("x-user-person-id", payload.personId as string);
    response.headers.set("x-user-email", payload.email as string);
    return response;
  } catch {
    // Invalid token
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|api/webhooks|api/sync).*)",
  ],
};
