import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth/dal";
import { getCampaignById } from "@/lib/queries/campaign-queries";
import { getServerT } from "@/lib/i18n/server";
import { CampaignMetrics } from "@/components/campaigns/campaign-metrics";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const t = await getServerT();

  return (
    <div style={{ padding: 24 }}>
      <Link href="/crm/campaigns" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16, color: "#666" }}>
        <ArrowLeft size={16} /> {t("campaign.title")}
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>{campaign.name}</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>{campaign.subject}</p>

      <CampaignMetrics
        sentCount={campaign.sentCount}
        openCount={campaign.openCount}
        bounceCount={campaign.bounceCount}
        recipientCount={campaign.recipients.length}
      />

      {/* Recipients */}
      <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 32, marginBottom: 16 }}>
        {t("campaign.audience")} ({campaign.recipients.length})
      </h2>

      {campaign.recipients.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--cc-border, #e0e0e0)", textAlign: "left" }}>
              <th style={{ padding: "8px 12px" }}>Email</th>
              <th style={{ padding: "8px 12px" }}>Pessoa</th>
              <th style={{ padding: "8px 12px" }}>Estado</th>
              <th style={{ padding: "8px 12px" }}>Enviado</th>
              <th style={{ padding: "8px 12px" }}>Aberto</th>
            </tr>
          </thead>
          <tbody>
            {campaign.recipients.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--cc-border, #eee)" }}>
                <td style={{ padding: "8px 12px" }}>{r.email}</td>
                <td style={{ padding: "8px 12px" }}>{r.person?.name ?? "-"}</td>
                <td style={{ padding: "8px 12px" }}>
                  <span style={{
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                    background: r.status === "sent" ? "#d1fae5" : r.status === "opened" ? "#dbeafe" : r.status === "bounced" ? "#fee2e2" : "#f3f4f6",
                    color: r.status === "sent" ? "#065f46" : r.status === "opened" ? "#1e40af" : r.status === "bounced" ? "#991b1b" : "#374151",
                  }}>
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: "8px 12px", fontSize: 13, color: "#666" }}>
                  {r.sentAt ? new Date(r.sentAt).toLocaleString("pt-PT") : "-"}
                </td>
                <td style={{ padding: "8px 12px", fontSize: 13, color: "#666" }}>
                  {r.openedAt ? new Date(r.openedAt).toLocaleString("pt-PT") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
