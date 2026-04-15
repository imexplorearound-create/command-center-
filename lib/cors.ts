/**
 * CORS helpers — restringem Origin a Chrome extension + allowlist configurável.
 *
 * Em vez de `Access-Control-Allow-Origin: *`, devolvemos o Origin do pedido
 * apenas se estiver na whitelist. Ferramentas sem header Origin (curl, server-to-server)
 * não dependem de CORS e passam na mesma — o gate real é o JWT Bearer.
 */

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Sem Origin = request não-browser (curl, server). JWT ainda é exigido.
  if (origin.startsWith("chrome-extension://")) return true;

  const allowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}

export function buildCorsHeaders(origin: string | null, methods = "POST, OPTIONS"): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  };
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
