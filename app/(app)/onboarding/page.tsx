import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/dal";
import { basePrisma } from "@/lib/db";
import { getTenantId, getTenantLocale } from "@/lib/tenant";
import { getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/context";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const tenantId = await getTenantId();
  const tenant = await basePrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, onboardingCompletedAt: true },
  });

  if (tenant?.onboardingCompletedAt) redirect("/");

  const locale = await getTenantLocale();
  const dictionary = getDictionary(locale);

  // Get module catalog for step 5
  const moduleCatalog = await basePrisma.moduleCatalog.findMany({
    orderBy: [{ tier: "asc" }, { sortOrder: "asc" }],
    select: { key: true, label: true, isCore: true, tier: true },
  });

  const modules = moduleCatalog.map((m) => ({
    key: m.key,
    label: (m.label as Record<string, string>)[locale] ?? (m.label as Record<string, string>)["pt-PT"] ?? m.key,
    isCore: m.isCore,
    tier: m.tier,
  }));

  return (
    <I18nProvider dictionary={dictionary}>
      <OnboardingWizard tenantName={tenant?.name ?? ""} modules={modules} />
    </I18nProvider>
  );
}
