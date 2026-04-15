import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/dal";
import { basePrisma } from "@/lib/db";
import { getTenantId } from "@/lib/tenant";
import { getServerT } from "@/lib/i18n/server";
import { LLMConfigForm } from "./llm-config-form";

export const dynamic = "force-dynamic";

export default async function LLMSettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/settings");

  const tenantId = await getTenantId();
  const t = await getServerT();

  const config = await basePrisma.tenantLLMConfig.findUnique({
    where: { tenantId },
  });

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>{t("settings.llm")}</h1>
      <LLMConfigForm
        current={config ? {
          provider: config.provider,
          endpoint: config.endpoint ?? "",
          model: config.model,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          hasApiKey: !!config.apiKeyEncrypted,
        } : null}
      />
    </div>
  );
}
