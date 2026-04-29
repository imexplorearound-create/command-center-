import { redirect } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { MaestroMount } from "@/components/maestro/maestro-mount";
import { getAuthUser } from "@/lib/auth/dal";
import { getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/context";
import { getTenantLocale } from "@/lib/tenant";
import { getUnreadBriefingCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const locale = user.tenantId ? await getTenantLocale() : "pt-PT";
  const dictionary = getDictionary(locale);
  const unreadBriefings =
    user.role === "cliente" ? 0 : await getUnreadBriefingCount(user.userId);

  return (
    <I18nProvider dictionary={dictionary}>
      <TopNav
        userName={user.name}
        userEmail={user.email}
        userRole={user.role}
        unreadBriefings={unreadBriefings}
      />
      <main style={{ minHeight: "calc(100vh - 54px)" }}>{children}</main>
      <MaestroMount />
    </I18nProvider>
  );
}
