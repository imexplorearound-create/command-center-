import { Kicker } from "@/components/cc/atoms";

export function TvCard() {
  return (
    <section style={{ marginTop: 28 }}>
      <div
        className="card"
        style={{
          background: "var(--bg-2)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <Kicker accent>Modo 2º monitor</Kicker>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--ink-2)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Abre o dashboard numa janela nova em read-only com refresh a 60s — ideal
          para um segundo monitor em cima da secretária.
        </p>
        <a
          href="/tv"
          target="_blank"
          rel="noopener"
          className="btn btn-primary"
          style={{ alignSelf: "flex-start", fontSize: 12 }}
        >
          Abrir em TV mode
        </a>
      </div>
    </section>
  );
}
