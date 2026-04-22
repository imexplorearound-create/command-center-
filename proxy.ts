import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getSecretKey } from "@/lib/auth/secret";

const DEFAULT_TENANT_SLUG = "imexplorearound";

const PUBLIC_PATHS = ["/login", "/_next", "/favicon.ico", "/api/webhooks", "/api/sync", "/api/agent", "/api/feedback", "/api/handoff-asset"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Resolve tenant slug from subdomain
  const host = request.headers.get("host") ?? "";
  const subdomain = host.split(".")[0];
  // Dev/IP access: default tenant. Production: subdomain-based.
  const isIpOrLocal = subdomain === "localhost"
    || subdomain.startsWith("127")
    || /^\d+$/.test(subdomain); // IP address (e.g. 91.99.211.238 → "91")
  const tenantSlug = isIpOrLocal
    ? (request.headers.get("x-tenant-slug") ?? DEFAULT_TENANT_SLUG)
    : subdomain;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const response = NextResponse.next();
    response.headers.set("x-tenant-slug", tenantSlug);
    return response;
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
      const isClientHub = /^\/project\/[^/]+\/client/.test(pathname);
      if (!isClientHub && pathname !== "/") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    // Pass user info + tenant slug to server components via headers
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.userId as string);
    response.headers.set("x-user-role", role);
    response.headers.set("x-user-person-id", payload.personId as string);
    response.headers.set("x-user-email", payload.email as string);
    response.headers.set("x-tenant-slug", tenantSlug);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|api/webhooks|api/sync|api/agent|api/feedback|api/handoff-asset).*)",
  ],
};
