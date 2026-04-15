import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MaestroMount } from "@/components/maestro/maestro-mount";
import { getAuthUser } from "@/lib/auth/dal";
import { getTenantDb } from "@/lib/tenant";
import { getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/context";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const locale = user.tenantId ? (await getLocaleFromSession()) : "pt-PT";
  const dictionary = getDictionary(locale);

  const db = await getTenantDb();
  const moduleConfigs = await db.tenantModuleConfig.findMany({
    where: { isEnabled: true },
    include: { module: { select: { key: true, sortOrder: true } } },
    orderBy: { module: { sortOrder: "asc" } },
  });
  const enabledModules = moduleConfigs.map((mc) => mc.module.key);

  return (
    <I18nProvider dictionary={dictionary}>
      <Sidebar userRole={user.role} enabledModules={enabledModules} />
      <div className="cc-content" style={{ marginLeft: 230, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Topbar />
        <div className="cc-main">{children}</div>
      </div>
      <MaestroMount />
    </I18nProvider>
  );
}

async function getLocaleFromSession(): Promise<string> {
  const { getSession } = await import("@/lib/auth/session");
  const session = await getSession();
  return session?.locale ?? "pt-PT";
}
