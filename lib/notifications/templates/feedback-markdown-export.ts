import {
  CLASSIFICATION_LABELS,
  SEVERITY_LABELS,
  SEVERITY_DESCRIPTIONS,
} from "./feedback-labels";
import type { ExtraScreenshot } from "@/lib/feedback-utils";

interface AcceptanceCriterion {
  text: string;
  done?: boolean;
}

interface ExportItem {
  classification: string | null;
  priority: string | null;
  module: string | null;
  pageUrl: string | null;
  pageTitle: string | null;
  voiceTranscript: string | null;
  voiceAudioUrl: string | null;
  screenshotUrl: string | null;
  extraScreenshots: ExtraScreenshot[];
  expectedResult: string | null;
  actualResult: string | null;
  reproSteps: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  taskId: string | null;
  triagedAt: Date | null;
  aiSummary: string | null;
}

interface ExportInput {
  projectName: string;
  projectSlug: string;
  testerName: string;
  startedAt: Date;
  durationSeconds: number | null;
  pagesVisited: string[];
  baseUrl: string;
  items: ExportItem[];
  /**
   * Se presente, é usado para resolver URLs de assets (screenshots, áudio) em vez
   * de baseUrl + path. Usado pelo handoff agent endpoint para gerar URLs assinadas.
   */
  signAsset?: (relativePath: string) => string;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function buildExportFilename(input: {
  projectSlug: string;
  testerName: string;
  startedAt: Date;
}): string {
  const d = input.startedAt;
  const stamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  const slugName = input.testerName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${stamp}-${input.projectSlug}-${slugName || "tester"}.md`;
}

export function buildFeedbackMarkdownExport(input: ExportInput): string {
  const d = input.startedAt;
  const dateStr = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const lines: string[] = [];

  lines.push(
    `# Relatório de Testes — ${input.projectName}`,
    "",
    "## Cabeçalho",
    "",
    "```",
    `Data: ${dateStr}`,
    `Tester: ${input.testerName}`,
    `Projecto: ${input.projectName} (${input.projectSlug})`,
    `Duração: ${input.durationSeconds ? Math.round(input.durationSeconds / 60) + " min" : "—"}`,
    `Páginas visitadas: ${input.pagesVisited.length}`,
    `Ambiente: prod`,
    `Browser: Chrome (extension Command Center Feedback)`,
    `Primeira página: ${input.pagesVisited[0] ?? "—"}`,
    "```",
    ""
  );

  if (input.items.length === 0) {
    lines.push("_Sem notas gravadas nesta sessão._", "");
    return lines.join("\n");
  }

  lines.push("---", "", "## Items", "");

  input.items.forEach((item, idx) => {
    const nn = String(idx + 1).padStart(2, "0");
    const clsRaw = item.classification || "—";
    const clsLabel = CLASSIFICATION_LABELS[clsRaw] || clsRaw;
    const sevKey = item.priority || "";
    const sevLabel = SEVERITY_LABELS[sevKey] || "—";
    const sevDesc = SEVERITY_DESCRIPTIONS[sevKey] || "";
    const titleShort = (item.aiSummary || item.voiceTranscript || "Sem título")
      .trim()
      .slice(0, 80)
      .replace(/\n+/g, " ");
    const pagePath = item.pageUrl
      ? (() => {
          try { const u = new URL(item.pageUrl); return u.pathname + u.search; } catch { return item.pageUrl; }
        })()
      : "—";

    lines.push(
      `### #${nn} ${titleShort}`,
      "",
      `- **Tipo:** \`${clsLabel.toLowerCase()}\``,
      `- **Severidade:** \`${sevLabel}\`${sevDesc ? " — " + sevDesc : ""}`,
      `- **Página:** \`${pagePath}\``,
      `- **Módulo:** ${item.module || "—"}`,
      `- **Task no DashboardPM:** ${item.taskId ? `\`TSK-${item.taskId.slice(0, 8)}\`` : "_(não convertido)_"}`,
      `- **Triado em:** ${item.triagedAt ? item.triagedAt.toISOString() : "_(pendente)_"}`,
      "",
      "**Passos para reproduzir**",
      ""
    );

    if (item.reproSteps.length > 0) {
      item.reproSteps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    } else {
      lines.push("_(não preenchido)_");
    }
    lines.push("");

    lines.push(
      "**Resultado esperado**",
      "",
      item.expectedResult ? item.expectedResult : "_(não preenchido)_",
      "",
      "**Resultado actual**",
      "",
      item.actualResult ? item.actualResult : "_(não preenchido)_",
      "",
      "**Evidência**",
      ""
    );

    const resolveAsset = (path: string) =>
      input.signAsset ? input.signAsset(path) : `${input.baseUrl}${path}`;

    if (item.screenshotUrl) {
      lines.push(`- Screenshot principal: ${resolveAsset(item.screenshotUrl)}`);
    }
    for (const extra of item.extraScreenshots) {
      const secs = (extra.timestampMs / 1000).toFixed(1);
      lines.push(`- Screenshot @ +${secs}s: ${resolveAsset(extra.url)}`);
    }
    if (item.voiceAudioUrl) {
      lines.push(`- Áudio: ${resolveAsset(item.voiceAudioUrl)}`);
    }
    if (!item.screenshotUrl && item.extraScreenshots.length === 0 && !item.voiceAudioUrl) {
      lines.push("- _(sem evidência anexada)_");
    }
    lines.push("");

    lines.push("**Critérios de aceitação**", "");
    if (item.acceptanceCriteria.length > 0) {
      for (const c of item.acceptanceCriteria) {
        lines.push(`- [${c.done ? "x" : " "}] ${c.text}`);
      }
    } else {
      lines.push("- _(não preenchido)_");
    }
    lines.push("");

    if (item.voiceTranscript) {
      lines.push(
        "**Transcrição (gravação)**",
        "",
        "> " + item.voiceTranscript.trim().replace(/\n+/g, "\n> "),
        ""
      );
    }

    lines.push("---", "");
  });

  lines.push(
    "## Rubrica de severidade",
    "",
    "| Nível | Critério |",
    "|---|---|",
    "| **P0** | Bloqueia operação crítica · perda de dados · segurança |",
    "| **P1** | Afecta receita/conversão · workflow principal degradado |",
    "| **P2** | Fricção notável com workaround · UX pobre em fluxo secundário |",
    "| **P3** | Polish · cosmético · nice-to-have |"
  );

  return lines.join("\n");
}
