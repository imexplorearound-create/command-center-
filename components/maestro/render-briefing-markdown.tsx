import type { ReactNode } from "react";

/**
 * Render minimalista de markdown para briefings:
 * - linhas começadas por # → heading
 * - linhas começadas por - ou * → bullets
 * - **bold** inline
 * - emojis e texto cru passam directos
 *
 * Não suportamos links/imagens/tabelas porque o Maestro não os gera no briefing.
 */
export function renderBriefingMarkdown(content: string): ReactNode {
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let bullets: ReactNode[] = [];

  function flushBullets() {
    if (bullets.length === 0) return;
    elements.push(
      <ul key={`ul-${elements.length}`} style={{ marginLeft: 18, marginBottom: 8 }}>
        {bullets}
      </ul>,
    );
    bullets = [];
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trimEnd();
    if (trimmed.startsWith("# ")) {
      flushBullets();
      elements.push(
        <h3 key={idx} style={{ margin: "12px 0 6px", fontSize: "1rem", fontWeight: 700 }}>
          {renderInline(trimmed.slice(2))}
        </h3>,
      );
    } else if (trimmed.startsWith("## ")) {
      flushBullets();
      elements.push(
        <h4 key={idx} style={{ margin: "10px 0 4px", fontSize: "0.95rem", fontWeight: 700 }}>
          {renderInline(trimmed.slice(3))}
        </h4>,
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      bullets.push(
        <li key={idx} style={{ marginBottom: 2 }}>
          {renderInline(trimmed.slice(2))}
        </li>,
      );
    } else if (trimmed.length === 0) {
      flushBullets();
    } else {
      flushBullets();
      elements.push(
        <p key={idx} style={{ margin: "4px 0", fontSize: "0.9rem", lineHeight: 1.5 }}>
          {renderInline(trimmed)}
        </p>,
      );
    }
  });
  flushBullets();
  return <>{elements}</>;
}

function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={key++}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
