import { getValidationItems, getTrustScores } from "@/lib/queries";
import { scoreColor, confidenceColor } from "@/lib/utils";
import { ValidationActions } from "./validation-actions";
import type { ExtractionType } from "@/lib/types";

const TYPE_ICONS: Record<ExtractionType, { icon: string; bg: string }> = {
  tarefa: { icon: "📋", bg: "var(--accent-glow)" },
  decisao: { icon: "✅", bg: "var(--green-glow)" },
  resumo: { icon: "📝", bg: "rgba(255,255,255,0.05)" },
  prioridade: { icon: "🏷️", bg: "var(--yellow-glow)" },
  responsavel: { icon: "👤", bg: "rgba(139,92,246,0.12)" },
  conteudo: { icon: "🎬", bg: "var(--red-glow)" },
  ligacao_codigo: { icon: "🔗", bg: "rgba(255,255,255,0.05)" },
  feedback_teste: { icon: "🎤", bg: "rgba(55,138,221,0.12)" },
};

export async function ValidationPanel() {
  const [validationItems, trustScores] = await Promise.all([
    getValidationItems(),
    getTrustScores(),
  ]);

  if (validationItems.length === 0 && trustScores.length === 0) return null;

  return (
    <div className="cc-card" style={{ marginBottom: 28 }}>
      {validationItems.length > 0 && (
        <>
          <div className="cc-section-title">🤖 A validar ({validationItems.length} itens)</div>

          {validationItems.map(item => {
            const pct = Math.round(item.confidence * 100);
            const cfg = TYPE_ICONS[item.type];
            const cc = confidenceColor(pct);
            return (
              <div key={item.id} className="cc-validation-item">
                <div className="cc-validation-left">
                  <div className="cc-validation-type" style={{ background: cfg.bg }}>{cfg.icon}</div>
                  <div className="cc-validation-info">
                    <div className="cc-validation-title">{item.title}</div>
                    <div className="cc-validation-meta">
                      {item.type} · {item.project} · {item.source}
                      {item.suggestedAssignee && <> · @{item.suggestedAssignee}</>}
                    </div>
                  </div>
                </div>
                <div className="cc-validation-confidence" style={{ color: cc.color, background: cc.bg }}>
                  {pct}%
                </div>
                <ValidationActions itemId={item.id} title={item.title} itemKind={item.kind} />
              </div>
            );
          })}
        </>
      )}

      {trustScores.length > 0 && (
        <div className="cc-trust-scores">
          {trustScores.map(ts => (
            <div key={ts.type} className="cc-trust-score-item">
              <div className="cc-trust-score-value" style={{ color: scoreColor(ts.score) }}>{ts.score}</div>
              <div className="cc-trust-score-label">{ts.type}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
