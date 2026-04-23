import { AgentGlyph, HealthIndicator, ExecutorBadge, STATE_COLOR } from "@/components/cc/atoms";
import type { CrewRoleCardData, AutonomyData } from "@/lib/types";

type Props = {
  crew: CrewRoleCardData[];
  autonomy: AutonomyData;
};

export function CrewColumn({ crew, autonomy }: Props) {
  return (
    <aside
      className="portiqa-theme"
      style={{
        background: "var(--bg)",
        borderRight: "1px solid var(--line)",
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <MaestroBlock />
      {crew.map((role) => (
        <RoleCard key={role.slug} role={role} />
      ))}
      <div style={{ flex: 1 }} />
      <AutonomyMeter autonomy={autonomy} />
    </aside>
  );
}

function MaestroBlock() {
  return (
    <div
      style={{
        padding: "14px 14px 16px",
        borderRadius: "var(--radius-card)",
        background: "rgba(200, 163, 94, 0.06)",
        border: "1px solid color-mix(in oklch, var(--accent) 14%, transparent)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AgentGlyph kind="maestro" size={28} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 20,
              fontWeight: 600,
              color: "var(--accent)",
              lineHeight: 1,
            }}
          >
            Maestro
          </span>
          <span className="mono" style={{ marginTop: 4 }}>
            Orquestrador do CC
          </span>
        </div>
      </div>
      <p
        className="lede"
        style={{
          fontSize: 12,
          margin: 0,
          color: "var(--ink-2)",
        }}
      >
        Tudo em ordem. Pipeline e Ops a trabalhar em paralelo.
      </p>
    </div>
  );
}

function RoleCard({ role }: { role: CrewRoleCardData }) {
  return (
    <div
      className="card"
      style={{
        padding: 14,
        background: "var(--bg-2)",
        borderTop: `2px solid ${role.color}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative", display: "inline-flex" }}>
          <AgentGlyph kind={role.slug} size={22} color={role.color} />
          <span
            style={{
              position: "absolute",
              right: -2,
              bottom: -2,
              width: 7,
              height: 7,
              borderRadius: 999,
              background: "var(--bg-2)",
              padding: 1,
              display: "inline-flex",
            }}
          >
            <HealthIndicator state={role.state} size={5} />
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            fontWeight: 600,
            color: role.color,
            flex: 1,
          }}
        >
          {role.name}
        </span>
        {role.state !== "idle" ? (
          <span className="meta" style={{ color: STATE_COLOR[role.state] }}>
            {role.state}
          </span>
        ) : null}
      </div>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          color: "var(--muted)",
          margin: "8px 0 10px",
          lineHeight: 1.4,
        }}
      >
        {role.description}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <ExecutorBadge kind={role.executor.kind} name={role.executor.name} />
      </div>
      {role.lastLine ? (
        <p className="meta" style={{ margin: "8px 0 0" }}>
          {role.lastLine}
        </p>
      ) : null}
      <div
        aria-hidden
        style={{
          marginTop: 10,
          height: 2,
          borderRadius: 2,
          background: `color-mix(in oklch, ${role.color} 14%, transparent)`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(role.load * 100)}%`,
            background: role.color,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

function AutonomyMeter({ autonomy }: { autonomy: AutonomyData }) {
  return (
    <div
      className="card"
      style={{
        padding: 14,
        background: "var(--bg-2)",
        textAlign: "left",
      }}
    >
      <span className="kicker">Autonomia · 7d</span>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 28,
          fontWeight: 600,
          color: "var(--ink)",
          lineHeight: 1,
          margin: "8px 0 6px",
        }}
      >
        {autonomy.totalTasks === 0 ? "—" : `${autonomy.percent}%`}
      </div>
      <span className="mono" style={{ color: "var(--muted)" }}>
        DAS ACÇÕES · SEM HUMANO
      </span>
    </div>
  );
}
