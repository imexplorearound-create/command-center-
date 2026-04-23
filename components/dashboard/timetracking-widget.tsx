interface TimetrackingWidgetProps {
  weekTotal: number;
  contractedHours: number;
  billableMinutes: number;
}

export function TimetrackingWidget({
  weekTotal,
  contractedHours,
  billableMinutes,
}: TimetrackingWidgetProps) {
  const hoursLogged = Math.floor(weekTotal / 60);
  const minutesLogged = weekTotal % 60;
  const billablePercent =
    weekTotal > 0 ? Math.round((billableMinutes / weekTotal) * 100) : 0;
  const progressPercent = Math.min(
    100,
    Math.round((weekTotal / (contractedHours * 60)) * 100)
  );

  return (
    <div className="cc-card" style={{ marginBottom: 16 }}>
      <div className="cc-section-title">⏱ Horas esta semana</div>
      <div style={{ display: "flex", gap: 24, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text)" }}>
            {hoursLogged}h {minutesLogged}m
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            de {contractedHours}h
          </div>
        </div>
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--green)" }}>
            {billablePercent}%
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>facturável</div>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
        <div
          style={{
            height: "100%",
            borderRadius: 3,
            background: "var(--accent)",
            width: progressPercent + "%",
          }}
        />
      </div>
    </div>
  );
}
