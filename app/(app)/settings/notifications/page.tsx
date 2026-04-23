import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/dal";
import { getTenantDb } from "@/lib/tenant";
import { getServerT } from "@/lib/i18n/server";
import { NotificationPrefsForm } from "./notification-prefs-form";

export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const t = await getServerT();

  const db = await getTenantDb();
  const dbUser = await db.user.findUnique({
    where: { id: user.userId },
    select: {
      notificationPrefs: true,
      telegramChatId: true,
      whatsappPhoneId: true,
    },
  });

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>{t("settings.notifications")}</h1>
      <NotificationPrefsForm
        currentPrefs={(dbUser?.notificationPrefs ?? {}) as Record<string, unknown>}
        telegramLinked={!!dbUser?.telegramChatId}
        whatsappPhone={dbUser?.whatsappPhoneId ?? null}
      />
    </div>
  );
}
