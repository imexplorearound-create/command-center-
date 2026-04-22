import type { FeedEventData } from "@/lib/types";

type Props = {
  events: FeedEventData[];
  windowMinutes?: number;
};

function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function Feed({ events, windowMinutes = 90 }: Props) {
  const visible = events.slice(0, 8);

  return (
    <section style={{ padding: "24px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 20,
            fontWeight: 600,
            color: "var(--ink)",
            margin: 0,
          }}
        >
          Fluxo da manhã
        </h2>
        <span className="mono">
          ÚLT {windowMinutes} MIN · {events.length} EVENT{events.length === 1 ? "O" : "OS"}
        </span>
      </div>

      {visible.length === 0 ? (
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--muted)" }}>
          Sem actividade nos últimos {windowMinutes} minutos.
        </p>
      ) : (
        <ol
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            borderLeft: "1px solid var(--line-2)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {visible.map((e) => (
            <li
              key={e.id}
              style={{
                position: "relative",
                paddingLeft: 18,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: -4,
                  top: 6,
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: "var(--muted)",
                }}
              />
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: "var(--muted)", minWidth: 40 }}
                >
                  {formatTime(e.time)}
                </span>
                {e.executorName ? (
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                  >
                    {e.executorName}
                  </span>
                ) : null}
              </div>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--ink-2)",
                  margin: 0,
                  lineHeight: 1.45,
                }}
              >
                {e.text}
              </p>
            </li>
          ))}
        </ol>
      )}

      {events.length > visible.length ? (
        <div style={{ marginTop: 16 }}>
          <a
            href="/feed"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--accent)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
            }}
          >
            Ver tudo →
          </a>
        </div>
      ) : null}
    </section>
  );
}
