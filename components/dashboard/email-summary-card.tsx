import { getTenantDb } from "@/lib/tenant";
import { Mail } from "lucide-react";
import Link from "next/link";

export async function EmailSummaryCard() {
  const db = await getTenantDb();

  const [total, uncategorized] = await Promise.all([
    db.emailRecord.count(),
    db.emailRecord.count({ where: { isProcessed: false } }),
  ]);

  return (
    <Link href="/email-sync" style={{ textDecoration: "none" }}>
      <div className="cc-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Mail size={18} style={{ color: "var(--cc-primary, #3b82f6)" }} />
          <span style={{ fontWeight: 600, color: "var(--text)" }}>Emails</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{uncategorized}</div>
        <div style={{ fontSize: 12, color: "#666" }}>
          por categorizar de {total} total
        </div>
      </div>
    </Link>
  );
}
