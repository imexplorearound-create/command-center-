"use client";

interface BriefingPrefs {
  enabled: boolean;
  hour: number;
  channel?: string;
}

interface Props {
  initial: BriefingPrefs;
  channels: string[];
  onChange: (next: BriefingPrefs) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function BriefingPrefsSection({ initial, channels, onChange }: Props) {
  const enabled = initial.enabled;
  const hour = initial.hour;
  const channel = initial.channel ?? "";

  return (
    <div style={{ marginTop: 24, padding: 16, border: "1px solid var(--cc-border, #e0e0e0)", borderRadius: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <strong>Briefing diário do Maestro</strong>
        {enabled && (
          <span style={{ fontSize: 12, color: "#10b981" }}>activo</span>
        )}
      </div>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Resumo automático com tarefas, deadlines, validações e novidades.
      </p>

      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange({ ...initial, enabled: e.target.checked })}
        />
        Receber briefing diário
      </label>

      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#666" }}>Hora preferida</span>
          <select
            className="cc-input"
            value={hour}
            onChange={(e) => onChange({ ...initial, hour: Number(e.target.value) })}
            disabled={!enabled}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#666" }}>Canal preferido</span>
          <select
            className="cc-input"
            value={channel}
            onChange={(e) =>
              onChange({ ...initial, channel: e.target.value || undefined })
            }
            disabled={!enabled}
          >
            <option value="">Auto (primeiro disponível)</option>
            {channels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
