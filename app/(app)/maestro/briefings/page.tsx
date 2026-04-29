import { requireNonClient } from "@/lib/auth/dal";
import { getBriefingsForUser } from "@/lib/queries";
import { BriefingList } from "@/components/maestro/briefing-list";
import { TriggerBriefingButton } from "@/components/maestro/trigger-briefing-button";

export default async function BriefingsPage() {
  const user = await requireNonClient();
  const briefings = await getBriefingsForUser(user.userId, 30);

  return (
    <>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="cc-page-title">Briefings</div>
          <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 4 }}>
            Resumo diário do Maestro com tarefas, deadlines, validações e novidades.
          </div>
        </div>
        <TriggerBriefingButton />
      </div>

      <BriefingList briefings={briefings} />
    </>
  );
}
