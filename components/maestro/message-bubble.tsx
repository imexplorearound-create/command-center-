"use client";
import type { ChatMessage } from "./use-maestro-chat";

const TOOL_LABELS: Record<string, string> = {
  listar_projectos: "📁 listar projectos",
  listar_tarefas: "📋 listar tarefas",
  listar_pessoas: "👥 listar pessoas",
  criar_tarefa: "➕ criar tarefa",
};

/**
 * Render super simples de markdown:
 * - Quebras de linha → <br>
 * - **bold** → <strong>
 * - `code` → <code>
 * - linhas começadas por `- ` → bullet
 */
function renderText(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    const isBullet = line.startsWith("- ") || line.startsWith("* ");
    const content = isBullet ? line.slice(2) : line;
    const parts: React.ReactNode[] = [];
    let i = 0;
    let key = 0;
    while (i < content.length) {
      if (content.slice(i, i + 2) === "**") {
        const end = content.indexOf("**", i + 2);
        if (end !== -1) {
          parts.push(<strong key={key++}>{content.slice(i + 2, end)}</strong>);
          i = end + 2;
          continue;
        }
      }
      if (content[i] === "`") {
        const end = content.indexOf("`", i + 1);
        if (end !== -1) {
          parts.push(
            <code
              key={key++}
              style={{
                background: "rgba(255,255,255,0.08)",
                padding: "1px 5px",
                borderRadius: 3,
                fontSize: "0.92em",
              }}
            >
              {content.slice(i + 1, end)}
            </code>
          );
          i = end + 1;
          continue;
        }
      }
      // Plain char until next special
      let next = content.length;
      const nextBold = content.indexOf("**", i);
      const nextCode = content.indexOf("`", i);
      if (nextBold !== -1) next = Math.min(next, nextBold);
      if (nextCode !== -1) next = Math.min(next, nextCode);
      parts.push(content.slice(i, next));
      i = next;
    }

    return (
      <div
        key={idx}
        style={{
          paddingLeft: isBullet ? 16 : 0,
          textIndent: isBullet ? -10 : 0,
        }}
      >
        {isBullet && "• "}
        {parts}
      </div>
    );
  });
}

export function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          maxWidth: "92%",
          background: isUser ? "var(--accent-glow)" : "rgba(255,255,255,0.05)",
          border: isUser
            ? "1px solid rgba(99,102,241,0.3)"
            : "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--text)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg.content ? renderText(msg.content) : msg.streaming ? (
          <span style={{ opacity: 0.5 }}>A pensar…</span>
        ) : null}
        {msg.error && (
          <div style={{ color: "var(--red)", marginTop: 6, fontSize: 12 }}>
            ⚠️ {msg.error}
          </div>
        )}
      </div>

      {msg.toolCalls && msg.toolCalls.length > 0 && (
        <div
          style={{
            marginTop: 6,
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          {msg.toolCalls.map((tc) => {
            const label = TOOL_LABELS[tc.name] ?? tc.name;
            const status =
              tc.ok === undefined ? "…" : tc.ok ? "✓" : "✗";
            const color =
              tc.ok === undefined
                ? "var(--text-dim)"
                : tc.ok
                  ? "var(--green)"
                  : "var(--red)";
            return (
              <span
                key={tc.id}
                title={tc.display ?? tc.name}
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {label} <span>{status}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
