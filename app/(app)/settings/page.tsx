import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth/dal";
import { getServerT } from "@/lib/i18n/server";
import { Bot, Bell, Settings, KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const t = await getServerT();

  const isAdmin = user.role === "admin";

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>
        <Settings size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />
        {t("settings.title")}
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {isAdmin && (
          <Link href="/settings/llm" style={{ textDecoration: "none" }}>
            <div className="cc-card" style={{ padding: 20 }}>
              <Bot size={24} style={{ marginBottom: 8, color: "var(--cc-primary, #3b82f6)" }} />
              <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{t("settings.llm")}</div>
              <div style={{ fontSize: 13, color: "#666" }}>Configurar fornecedor e modelo AI para o Maestro</div>
            </div>
          </Link>
        )}

        {isAdmin && (
          <Link href="/settings/api-keys" style={{ textDecoration: "none" }}>
            <div className="cc-card" style={{ padding: 20 }}>
              <KeyRound size={24} style={{ marginBottom: 8, color: "var(--cc-primary, #3b82f6)" }} />
              <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>API Keys · Dev</div>
              <div style={{ fontSize: 13, color: "#666" }}>Tokens para o developer (Bruno) aceder a /api/dev/*</div>
            </div>
          </Link>
        )}

        <Link href="/settings/notifications" style={{ textDecoration: "none" }}>
          <div className="cc-card" style={{ padding: 20 }}>
            <Bell size={24} style={{ marginBottom: 8, color: "var(--cc-primary, #3b82f6)" }} />
            <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{t("settings.notifications")}</div>
            <div style={{ fontSize: 13, color: "#666" }}>Canais, Telegram, WhatsApp e preferências de alertas</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
