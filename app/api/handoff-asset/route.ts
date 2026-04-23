import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { promises as fs, createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { verifyAssetToken } from "@/lib/handoff-auth";

// Acima deste tamanho, streamamos em vez de carregar em memória.
const STREAM_THRESHOLD_BYTES = 2 * 1024 * 1024;

const ALLOWED_PREFIXES = ["/feedback-screenshots/", "/feedback-audio/"];

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".webm": "audio/webm",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".mp4": "audio/mp4",
};

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 401 });
  }

  const verified = await verifyAssetToken(token);
  if (!verified) {
    return NextResponse.json({ error: "invalid or expired token" }, { status: 401 });
  }

  const rel = verified.path;
  if (!ALLOWED_PREFIXES.some((p) => rel.startsWith(p))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const publicDir = path.join(process.cwd(), "public");
  const abs = path.join(publicDir, rel);
  if (!abs.startsWith(publicDir + path.sep)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ext = path.extname(abs).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const headers = {
    "Content-Type": contentType,
    "Content-Length": String(stat.size),
    "Cache-Control": "private, max-age=3600",
  };

  if (stat.size >= STREAM_THRESHOLD_BYTES) {
    const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream<Uint8Array>;
    return new NextResponse(stream, { status: 200, headers });
  }

  const buffer = await fs.readFile(abs);
  return new NextResponse(new Uint8Array(buffer), { status: 200, headers });
}
