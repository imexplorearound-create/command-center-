import { progressPercent, progressColor, LOCALE } from "@/lib/utils";
import type { ObjectiveData } from "@/lib/types";

export function ObjectivesBar({ objectives }: { objectives: ObjectiveData[] }) {
  return (
    <div className="cc-card" style={{ marginBottom: 24 }}>
      <div className="cc-section-title">🎯 Objectivos 2026</div>
      {objectives.map((obj) => {
        const pct = progressPercent(obj.currentValue, obj.targetValue);
        return (
          <div key={obj.id} className="cc-objective">
            <div className="cc-objective-header">
              <span>{obj.title}</span>
              <span>
                {pct}% ({obj.currentValue.toLocaleString(LOCALE)}/{obj.targetValue.toLocaleString(LOCALE)} {obj.unit})
              </span>
            </div>
            <div className="cc-progress-bar">
              <div
                className="cc-progress-fill"
                style={{ width: `${pct}%`, backgroundColor: progressColor(pct) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
