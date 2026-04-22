import Link from "next/link";
import { LogoMark } from "@/components/cc/atoms";
import { TopbarAvatarDropdown } from "./topbar-avatar-dropdown";
import { TopNavLinks } from "./top-nav-links";

type Props = {
  userName: string;
  userEmail: string;
  maestroState?: "ok" | "backlog" | "down";
};

function formatDateTime(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", "").toUpperCase();
  const day = now.getDate();
  const month = now.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "").toUpperCase();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${weekday} · ${day} ${month} · ${hh}:${mm}`;
}

const MAESTRO_STATES: Record<"ok" | "backlog" | "down", { color: string; label: string }> = {
  ok:      { color: "var(--success, #2D8A5E)", label: "Maestro" },
  backlog: { color: "var(--accent, #B08A2C)",  label: "Maestro · backlog" },
  down:    { color: "var(--error, #C0392B)",   label: "Maestro · down" },
};

export function TopNav({ userName, userEmail, maestroState = "ok" }: Props) {
  const { color: maestroColor, label: maestroLabel } = MAESTRO_STATES[maestroState];

  return (
    <header
      className="portiqa-theme"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        height: 54,
        background: "var(--bg)",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 32,
      }}
    >
      <Link href="/" aria-label="Dashboard" style={{ textDecoration: "none", color: "inherit" }}>
        <LogoMark size={16} />
      </Link>

      <TopNavLinks />

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <time
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--muted, #8A8778)",
            letterSpacing: "0.05em",
          }}
        >
          {formatDateTime()}
        </time>

        <Link
          href="/maestro"
          aria-label="Abrir painel do Maestro"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 999,
            border: `1px solid color-mix(in oklch, ${maestroColor} 30%, transparent)`,
            color: maestroColor,
            background: `color-mix(in oklch, ${maestroColor} 10%, transparent)`,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: 999,
              background: maestroColor,
            }}
          />
          {maestroLabel}
        </Link>

        <TopbarAvatarDropdown userName={userName} userEmail={userEmail} />
      </div>
    </header>
  );
}
