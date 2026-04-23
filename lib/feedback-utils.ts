export interface AcceptanceCriterion {
  text: string;
  done: boolean;
}

export function parseAcceptanceCriteria(raw: unknown): AcceptanceCriterion[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Array<Record<string, unknown>>)
    .filter((c) => c && typeof c.text === "string")
    .map((c) => ({ text: String(c.text), done: !!c.done }));
}

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3100";
}

export function urlPathname(url: string | null | undefined): string {
  if (!url) return "—";
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

export interface ExtraScreenshot {
  url: string;
  timestampMs: number;
}

export function extractExtraScreenshots(contextSnapshot: unknown): ExtraScreenshot[] {
  if (!Array.isArray(contextSnapshot)) return [];
  const shots: ExtraScreenshot[] = [];
  for (const evt of contextSnapshot as Array<Record<string, unknown>>) {
    if (evt && evt.type === "screenshot" && typeof evt.url === "string" && typeof evt.timestampMs === "number") {
      shots.push({ url: evt.url, timestampMs: evt.timestampMs });
    }
  }
  return shots;
}

// Decodifica um data URL (data:image/...;base64,...) num Buffer + extensão.
// Devolve null se o formato for inválido ou o tamanho exceder maxBytes.
export function decodeImageDataUrl(
  raw: unknown,
  maxBytes: number
): { buffer: Buffer; ext: "jpg" | "png" } | null {
  if (typeof raw !== "string" || !raw.startsWith("data:image/")) return null;
  const commaIdx = raw.indexOf(",");
  if (commaIdx <= 0) return null;
  const mime = raw.slice(0, commaIdx).match(/data:(image\/[a-z]+)/i)?.[1] ?? "image/jpeg";
  const ext: "jpg" | "png" = mime === "image/png" ? "png" : "jpg";
  const decoded = Buffer.from(raw.slice(commaIdx + 1), "base64");
  if (decoded.length === 0 || decoded.length > maxBytes) return null;
  return { buffer: decoded, ext };
}
