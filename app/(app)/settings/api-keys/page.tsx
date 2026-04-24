import { KeyRound, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/dal";
import { basePrisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { ApiKeysClient } from "./api-keys-client";
import type { DevApiKeyScope } from "@/lib/validation/dev-api-key-schema";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const user = await requireAdminPage();

  const [keys, people] = await Promise.all([
    basePrisma.devApiKey.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        label: true,
        tokenPrefix: true,
        scopes: true,
        lastUsedAt: true,
        revokedAt: true,
        expiresAt: true,
        createdAt: true,
        person: { select: { id: true, name: true } },
      },
    }),
    basePrisma.person.findMany({
      where: { tenantId: user.tenantId, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows = keys.map((k) => ({
    id: k.id,
    label: k.label,
    tokenPrefix: k.tokenPrefix,
    scopes: k.scopes as DevApiKeyScope[],
    lastUsedAt: formatDateTime(k.lastUsedAt),
    revokedAt: formatDateTime(k.revokedAt),
    expiresAt: formatDateTime(k.expiresAt),
    createdAt: formatDateTime(k.createdAt),
    revoked: Boolean(k.revokedAt),
    expired: Boolean(k.expiresAt && k.expiresAt < new Date()),
    ownerName: k.person?.name ?? null,
  }));

  return (
    <div style={{ padding: 24 }}>
      <Link
        href="/settings"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 13,
          color: "#666",
          textDecoration: "none",
          marginBottom: 16,
        }}
      >
        <ChevronLeft size={14} /> Settings
      </Link>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
        <KeyRound size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />
        API Keys · Dev
      </h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>
        Chaves usadas pelo developer (Bruno) para aceder a <code>/api/dev/*</code>.
        Cada chave pertence a uma pessoa e tem scopes específicos.
      </p>

      <ApiKeysClient keys={rows} people={people} />
    </div>
  );
}
