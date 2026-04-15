import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/dal";
import { getCampaigns } from "@/lib/queries/campaign-queries";
import { getServerT } from "@/lib/i18n/server";
import { Plus, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  scheduled: "#f59e0b",
  sending: "#3b82f6",
  sent: "#10b981",
  archived: "#6b7280",
};

export default async function CampaignsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const t = await getServerT();

  const campaigns = await getCampaigns();

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>
          <Mail size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />
          {t("campaign.title")}
        </h1>
        <Link href="/crm/campaigns/new" className="cc-btn cc-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> {t("campaign.new")}
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <p style={{ color: "#666" }}>{t("campaign.no_campaigns")}</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--cc-border, #e0e0e0)", textAlign: "left" }}>
              <th style={{ padding: "8px 12px" }}>{t("campaign.name")}</th>
              <th style={{ padding: "8px 12px" }}>{t("campaign.subject")}</th>
              <th style={{ padding: "8px 12px" }}>Estado</th>
              <th style={{ padding: "8px 12px" }}>{t("campaign.sent_count")}</th>
              <th style={{ padding: "8px 12px" }}>{t("campaign.open_count")}</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--cc-border, #eee)" }}>
                <td style={{ padding: "10px 12px" }}>
                  <Link href={`/crm/campaigns/${c.id}`} style={{ fontWeight: 500 }}>
                    {c.name}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px", color: "#666" }}>{c.subject}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#fff",
                      background: STATUS_COLORS[c.status] ?? "#94a3b8",
                    }}
                  >
                    {t(`campaign.status.${c.status}`)}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>{c.sentCount}</td>
                <td style={{ padding: "10px 12px" }}>{c.openCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
