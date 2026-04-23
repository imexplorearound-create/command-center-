"use client";

import { useT } from "@/lib/i18n/context";
import { Send, Eye, AlertTriangle } from "lucide-react";

interface Props {
  sentCount: number;
  openCount: number;
  bounceCount: number;
  recipientCount: number;
}

export function CampaignMetrics({ sentCount, openCount, bounceCount, recipientCount }: Props) {
  const t = useT();
  const openRate = sentCount > 0 ? Math.round((openCount / sentCount) * 100) : 0;
  const bounceRate = recipientCount > 0 ? Math.round((bounceCount / recipientCount) * 100) : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      <MetricCard
        icon={<Send size={20} />}
        label={t("campaign.sent_count")}
        value={sentCount}
        color="#3b82f6"
      />
      <MetricCard
        icon={<Eye size={20} />}
        label={t("campaign.open_count")}
        value={`${openCount} (${openRate}%)`}
        color="#10b981"
      />
      <MetricCard
        icon={<AlertTriangle size={20} />}
        label={t("campaign.bounce_count")}
        value={`${bounceCount} (${bounceRate}%)`}
        color="#ef4444"
      />
      <MetricCard
        icon={<Send size={20} />}
        label={t("campaign.audience")}
        value={recipientCount}
        color="#8b5cf6"
      />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        border: "1px solid var(--cc-border, #e0e0e0)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ color }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
        <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      </div>
    </div>
  );
}
