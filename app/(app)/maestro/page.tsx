import { requireAdminPage } from "@/lib/auth/dal";
import { getTrustScoresByAgent, getRecentMaestroActions } from "@/lib/queries";
import { EXTRACTION_TYPES } from "@/lib/maestro/trust-rules";
import { MAESTRO_INTERNAL } from "@/lib/maestro/score-engine";
import { TrustScoreCard } from "@/components/maestro/trust-score-card";
import { RecentActionsList } from "@/components/maestro/recent-actions-list";
import { getServerT } from "@/lib/i18n/server";

export default async function MaestroPage() {
  await requireAdminPage();
  const t = await getServerT();

  const [scoresRaw, actions] = await Promise.all([
    getTrustScoresByAgent(MAESTRO_INTERNAL),
    getRecentMaestroActions(20, MAESTRO_INTERNAL),
  ]);

  // Garante que todas as categorias aparecem mesmo sem score ainda
  const byType = new Map(scoresRaw.map((s) => [s.extractionType, s]));
  const scores = EXTRACTION_TYPES.map(
    (type) =>
      byType.get(type) ?? {
        id: `placeholder-${type}`,
        agentId: MAESTRO_INTERNAL,
        extractionType: type,
        score: 0,
        confirmations: 0,
        edits: 0,
        rejections: 0,
        lastInteractionAt: null,
      }
  );

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div className="cc-page-title">{t("maestro.title")}</div>
        <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 4 }}>
          {t("maestro.subtitle")}
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 8, padding: 10, background: "var(--cc-primary-bg, #f1f5f9)", borderRadius: 6 }}>
          💡 <strong>{t("maestro.examples_label")}</strong> &quot;criar tarefa em projecto-X: refactor login&quot; · &quot;marca X como feita&quot; · &quot;atribui X ao Bruno&quot; · &quot;muda prioridade de X para alta&quot;
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 12 }}>
          {t("maestro.trust_score_hint")} <code>{MAESTRO_INTERNAL}</code>.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {scores.map((s) => (
          <TrustScoreCard key={s.extractionType} row={s} />
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>{t("maestro.recent_actions")}</div>
        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
          {t("maestro.recent_actions_hint")}
        </div>
      </div>
      <RecentActionsList actions={actions} />
    </>
  );
}
