"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDateShort } from "@/lib/utils";
import {
  classifyFeedbackItem,
  updateFeedbackItemStatus,
  convertFeedbackToTask,
  updateSessionStatus,
} from "@/lib/actions/feedback-actions";

const CLASSIFICATIONS = [
  { value: "bug", label: "🐛 Bug", color: "#E53935" },
  { value: "suggestion", label: "💡 Sugestão", color: "#378ADD" },
  { value: "question", label: "❓ Questão", color: "#F9A825" },
  { value: "praise", label: "👏 Elogio", color: "#4CAF50" },
];

interface SessionData {
  id: string;
  projectName: string;
  projectSlug: string;
  testerName: string;
  status: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number | null;
  pagesVisited: string[];
  itemsCount: number;
  createdAt: string;
}

interface ItemData {
  id: string;
  type: string;
  classification: string | null;
  priority: string | null;
  timestampMs: number | null;
  pageUrl: string | null;
  pageTitle: string | null;
  voiceAudioUrl: string | null;
  voiceTranscript: string | null;
  contextSnapshot: Record<string, unknown> | null;
  taskId: string | null;
  status: string;
  createdAt: string;
}

interface Props {
  session: SessionData;
  items: ItemData[];
}

export function FeedbackSessionView({ session, items }: Props) {
  const [pending, setPending] = useState<string | null>(null);

  async function handleClassify(itemId: string, classification: string) {
    setPending(itemId);
    const r = await classifyFeedbackItem(itemId, classification as "bug" | "suggestion" | "question" | "praise");
    setPending(null);
    if ("error" in r) toast.error(r.error);
    else toast.success("Classificado");
  }

  async function handleConvert(itemId: string) {
    setPending(itemId);
    const r = await convertFeedbackToTask(itemId);
    setPending(null);
    if ("error" in r) toast.error(r.error);
    else toast.success("Tarefa criada no kanban");
  }

  async function handleMarkReady() {
    const r = await updateSessionStatus(session.id, "ready");
    if ("error" in r) toast.error(r.error);
    else toast.success("Sessão marcada como pronta");
  }

  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <Link href="/feedback" style={{ color: "var(--muted)", textDecoration: "none", fontSize: "0.82rem" }}>
          ← Feedback
        </Link>
      </div>

      <div className="cc-page-header">
        <div className="cc-page-title">
          {session.projectName} — Feedback
        </div>
        <div className="cc-page-subtitle">
          por {session.testerName} · {formatDateShort(session.createdAt)} · {session.itemsCount} nota{session.itemsCount !== 1 ? "s" : ""}
          {session.durationSeconds && ` · ${Math.round(session.durationSeconds / 60)}min`}
        </div>
      </div>

      {session.status === "processing" && (
        <div className="cc-card" style={{ padding: "10px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--yellow)", fontSize: "0.85rem" }}>Sessão em processamento</span>
          <button
            onClick={handleMarkReady}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "1px solid var(--green)",
              background: "transparent",
              color: "var(--green)",
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            Marcar como pronta
          </button>
        </div>
      )}

      {session.pagesVisited.length > 0 && (
        <div className="cc-card" style={{ padding: "10px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Páginas visitadas</div>
          <div style={{ fontSize: "0.82rem", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {session.pagesVisited.map((url, i) => (
              <span key={i} style={{ background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4 }}>
                {url.replace(/https?:\/\/[^/]+/, "")}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => (
          <div key={item.id} className="cc-card" style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                {item.pageTitle && (
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 2 }}>
                    {item.pageTitle}
                  </div>
                )}
                {item.pageUrl && (
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", opacity: 0.7 }}>
                    {item.pageUrl.replace(/https?:\/\/[^/]+/, "")}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {item.classification && (
                  <span style={{
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: CLASSIFICATIONS.find((c) => c.value === item.classification)?.color ?? "#888",
                    color: "#fff",
                  }}>
                    {CLASSIFICATIONS.find((c) => c.value === item.classification)?.label ?? item.classification}
                  </span>
                )}
                {item.status === "converted" && (
                  <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 4, background: "#4CAF50", color: "#fff" }}>
                    ✓ Convertido
                  </span>
                )}
              </div>
            </div>

            {item.voiceAudioUrl && (
              <audio
                controls
                src={item.voiceAudioUrl}
                style={{ width: "100%", height: 36, marginBottom: 8 }}
              />
            )}

            {item.contextSnapshot && (() => {
              const snapshot = item.contextSnapshot;
              // v2: array of events (timeline)
              if (Array.isArray(snapshot) && snapshot.length > 0) {
                const EVENT_ICONS: Record<string, string> = {
                  click: "🖱",
                  input: "⌨️",
                  navigate: "📄",
                  focus: "🎯",
                  modal_open: "📋",
                  modal_close: "📋",
                };
                return (
                  <div style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: "rgba(55, 138, 221, 0.06)",
                    fontSize: "0.8rem",
                    marginBottom: 8,
                    borderLeft: "3px solid #378ADD",
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 6, color: "#378ADD", fontSize: "0.75rem" }}>
                      Timeline ({snapshot.length} evento{snapshot.length !== 1 ? "s" : ""})
                    </div>
                    {(snapshot as Array<Record<string, unknown>>).map((evt, i) => {
                      const icon = EVENT_ICONS[String(evt.type)] ?? "•";
                      const secs = ((Number(evt.timestampMs) || 0) / 1000).toFixed(1);
                      let label = String(evt.selector ?? "");
                      if (evt.type === "input" && evt.value) label += " → " + String(evt.value).slice(0, 50);
                      if (evt.type === "navigate") label = String(evt.pageUrl ?? "").replace(/https?:\/\/[^/]+/, "");
                      if (evt.type === "modal_open") label = "Abriu: " + String(evt.text ?? "").slice(0, 60);
                      if (evt.type === "modal_close") label = "Fechou modal";
                      if (evt.text && evt.type === "click") label += " — " + String(evt.text).slice(0, 40);
                      return (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 3, fontSize: "0.78rem" }}>
                          <span style={{ color: "var(--muted)", fontFamily: "monospace", minWidth: 42, textAlign: "right" }}>{secs}s</span>
                          <span>{icon}</span>
                          <span style={{ color: "var(--text)", wordBreak: "break-all" }}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              // v1: single element context (legacy)
              const ctx = snapshot as { selector?: string; text?: string; outerHTML?: string };
              if (ctx.selector) {
                return (
                  <div style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: "rgba(55, 138, 221, 0.08)",
                    fontSize: "0.8rem",
                    marginBottom: 8,
                    borderLeft: "3px solid #378ADD",
                    fontFamily: "monospace",
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: "#378ADD", fontSize: "0.75rem" }}>
                      🎯 Elemento
                    </div>
                    <div>{ctx.selector}</div>
                    {ctx.text && (
                      <div style={{ color: "var(--muted)", marginTop: 2 }}>
                        Texto: {ctx.text.slice(0, 100)}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            {item.voiceTranscript && (
              <div style={{
                padding: "8px 12px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.04)",
                fontSize: "0.88rem",
                lineHeight: 1.5,
                marginBottom: 8,
                borderLeft: "3px solid var(--accent)",
              }}>
                {item.voiceTranscript}
              </div>
            )}

            {item.status !== "converted" && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {CLASSIFICATIONS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => handleClassify(item.id, c.value)}
                    disabled={pending === item.id}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 4,
                      border: item.classification === c.value
                        ? `1px solid ${c.color}`
                        : "1px solid rgba(255,255,255,0.1)",
                      background: item.classification === c.value ? c.color + "22" : "transparent",
                      color: item.classification === c.value ? c.color : "var(--muted)",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    {c.label}
                  </button>
                ))}

                <button
                  onClick={() => handleConvert(item.id)}
                  disabled={pending === item.id}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 4,
                    border: "1px solid var(--accent)",
                    background: "transparent",
                    color: "var(--accent)",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    marginLeft: "auto",
                  }}
                >
                  📋 Criar tarefa
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
