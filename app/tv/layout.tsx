import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/dal";
import { getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/context";
import { getTenantLocale } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "TV · Command Center",
};

export default async function TvLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const locale = user.tenantId ? await getTenantLocale() : "pt-PT";
  const dictionary = getDictionary(locale);

  return (
    <I18nProvider dictionary={dictionary}>
      <meta httpEquiv="refresh" content="60" />
      {children}
    </I18nProvider>
  );
}
