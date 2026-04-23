import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth/dal";
import { getEmailTemplates } from "@/lib/queries/campaign-queries";
import { getTenantDb } from "@/lib/tenant";
import { getServerT } from "@/lib/i18n/server";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const t = await getServerT();

  const [templates, db] = await Promise.all([
    getEmailTemplates(),
    getTenantDb(),
  ]);

  const [areas, projects] = await Promise.all([
    db.area.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.project.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <Link href="/crm/campaigns" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16, color: "#666" }}>
        <ArrowLeft size={16} /> {t("campaign.title")}
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>{t("campaign.new")}</h1>

      <CampaignForm
        templates={templates.map((tpl) => ({
          id: tpl.id,
          name: tpl.name,
          subject: tpl.subject,
          htmlContent: tpl.htmlContent,
        }))}
        areas={areas}
        projects={projects}
      />
    </div>
  );
}
