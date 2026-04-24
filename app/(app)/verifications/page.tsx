import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getAuthUser } from "@/lib/auth/dal";
import { getVerificationQueue, isPingPongFlag } from "@/lib/queries/verification-queue";
import { VerificationCard } from "./verification-card";

export const dynamic = "force-dynamic";

export default async function VerificationsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const items = await getVerificationQueue(user);

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
        <CheckCircle2 size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />
        Verificações pendentes
      </h1>
      <p style={{ fontSize: 13, color: "var(--muted, #666)", marginBottom: 24 }}>
        Feedback aprovado por ti (ou cliente) → developer marcou como pronto a verificar.
        Confirma que a alteração resolve o problema original ou rejeita com motivo.
      </p>

      {items.length === 0 ? (
        <p style={{ color: "var(--muted, #888)", fontSize: 14 }}>
          Nada pendente. Quando o developer marcar uma task como pronta, aparece aqui.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map((item) => (
            <VerificationCard
              key={item.feedbackItemId}
              item={item}
              flagged={isPingPongFlag(item.verifyRejectionsCount)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
