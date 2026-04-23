"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDateShort } from "@/lib/utils";
import {
  archiveFeedbackItem,
  classifyFeedbackItem,
  convertFeedbackToTask,
  deleteFeedbackItem,
  sendItemToProducer,
  updateFeedbackItemTriage,
  updateSessionStatus,
} from "@/lib/actions/feedback-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useT } from "@/lib/i18n/context";
import { SessionActions } from "../session-actions";
import {
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  SEVERITY_DESCRIPTIONS,
} from "@/lib/notifications/templates/feedback-labels";
import {
  FEEDBACK_PRIORITY_VALUES,
  type FeedbackPriority,
} from "@/lib/validation/feedback-schema";
import type { AcceptanceCriterion } from "@/lib/feedback-utils";
import { HANDOFF_STATUS, type HandoffStatus } from "@/lib/handoff-status";

const CLASSIFICATION_VALUES = ["bug", "suggestion", "question", "praise"] as const;
const CLASSIFICATION_COLORS: Record<string, string> = {
  bug: "#E53935",
  suggestion: "#378ADD",
  question: "#F9A825",
  praise: "#4CAF50",
};

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
  archived: boolean;
}

interface ItemData {
  id: string;
  type: string;
  classification: string | null;
  priority: string | null;
  module: string | null;
  timestampMs: number | null;
  pageUrl: string | null;
  pageTitle: string | null;
  voiceAudioUrl: string | null;
  voiceTranscript: string | null;
  contextSnapshot: Record<string, unknown> | null;
  taskId: string | null;
  status: string;
  createdAt: string;
  expectedResult: string | null;
  actualResult: string | null;
  reproSteps: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  screenshotUrl: string | null;
  aiDraftedAt: string | null;
  triagedAt: string | null;
  handoffStatus: string | null;
  handoffAgentId: string | null;
  handoffResolvedAt: string | null;
}

interface Props {
  session: SessionData;
  items: ItemData[];
}

export function FeedbackSessionView({ session, items }: Props) {
  const t = useT();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const classifications = useMemo(
    () =>
      CLASSIFICATION_VALUES.map((value) => ({
        value,
        label: t(`feedback.class.${value}`),
        color: CLASSIFICATION_COLORS[value],
      })),
    [t]
  );
  const classificationByValue = useMemo(
    () => new Map(classifications.map((c) => [c.value, c])),
    [classifications]
  );

  async function handleClassify(itemId: string, classification: string) {
    setPending(itemId);
    const r = await classifyFeedbackItem(itemId, classification as "bug" | "suggestion" | "question" | "praise");
    setPending(null);
    if ("error" in r) toast.error(r.error);
    else toast.success(t("feedback.item.classified"));
  }

  async function handleConvert(itemId: string) {
    setPending(itemId);
    const r = await convertFeedbackToTask(itemId);
    setPending(null);
    if ("error" in r) toast.error(r.error);
    else toast.success(t("feedback.item.task_created"));
  }

  async function handleSendToProducer(itemId: string) {
    setPending(itemId);
    const r = await sendItemToProducer(itemId);
    setPending(null);
    if ("error" in r) toast.error(r.error);
    else {
      toast.success("Enviado ao produtor (Bruno)");
      router.refresh();
    }
  }

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleArchive(itemId: string) {
    setPending(itemId);
    const r = await archiveFeedbackItem(itemId);
    setPending(null);
    if ("error" in r) toast.error(r.error);
    else {
      toast.success("Item arquivado");
      router.refresh();
    }
  }

  async function handleDelete(itemId: string) {
    setPending(itemId);
    const r = await deleteFeedbackItem(itemId);
    setPending(null);
    setConfirmDelete(null);
    if ("error" in r) toast.error(r.error);
    else {
      toast.success("Item apagado");
      router.refresh();
    }
  }

  const untriagedCount = items.filter((it) => !it.triagedAt).length;

  async function handleMarkReady() {
    const r = await updateSessionStatus(session.id, "ready");
    if ("error" in r) toast.error(r.error);
    else toast.success(t("feedback.session.marked_ready"));
  }

  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <Link href="/feedback" style={{ color: "var(--muted)", textDecoration: "none", fontSize: "0.82rem" }}>
          ← {t("feedback.session.back")}
        </Link>
      </div>

      <div className="cc-page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div className="cc-page-title">
              {session.projectName} — {t("feedback.session.title_suffix")}
            </div>
            <div className="cc-page-subtitle">
              {t("feedback.session.subtitle_by", {
                tester: session.testerName,
                date: formatDateShort(session.createdAt),
                count: session.itemsCount,
                label: session.itemsCount !== 1 ? t("feedback.session.notes_many") : t("feedback.session.notes_one"),
              })}
              {session.durationSeconds && t("feedback.session.duration", { minutes: Math.round(session.durationSeconds / 60) })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            <a
              href={`/feedback/${session.id}/export.md`}
              style={{
                padding: "5px 12px",
                borderRadius: 4,
                border: "1px solid var(--accent)",
                background: "transparent",
                color: "var(--accent)",
                fontSize: "0.78rem",
                textDecoration: "none",
                fontWeight: 600,
              }}
              title={untriagedCount > 0 ? `${untriagedCount} item(s) por triar — export inclui campos em branco` : undefined}
            >
              📄 Exportar .md{untriagedCount > 0 ? ` (${untriagedCount} por triar)` : ""}
            </a>
            <SessionActions
              sessionId={session.id}
              archived={session.archived}
              onDeleted={() => router.push("/feedback")}
            />
          </div>
        </div>
      </div>

      {session.status === "processing" && (
        <div className="cc-card" style={{ padding: "10px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--yellow)", fontSize: "0.85rem" }}>{t("feedback.session.processing")}</span>
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
            {t("feedback.session.mark_ready")}
          </button>
        </div>
      )}

      {session.pagesVisited.length > 0 && (
        <div className="cc-card" style={{ padding: "10px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("feedback.session.pages_visited")}</div>
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
        {items.map((item) => {
          const cls = item.classification
            ? classificationByValue.get(item.classification as typeof CLASSIFICATION_VALUES[number])
            : null;
          return (
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
                    background: cls?.color ?? "#888",
                    color: "#fff",
                  }}>
                    {cls?.label ?? item.classification}
                  </span>
                )}
                {item.status === "converted" && (
                  <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 4, background: "#4CAF50", color: "#fff" }}>
                    {t("feedback.item.converted")}
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
                  screenshot: "📸",
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
                      {t("feedback.timeline.title", {
                        count: snapshot.length,
                        label: snapshot.length !== 1 ? t("feedback.timeline.event_many") : t("feedback.timeline.event_one"),
                      })}
                    </div>
                    {(snapshot as Array<Record<string, unknown>>).map((evt, i) => {
                      const icon = EVENT_ICONS[String(evt.type)] ?? "•";
                      const secs = ((Number(evt.timestampMs) || 0) / 1000).toFixed(1);
                      if (evt.type === "screenshot" && typeof evt.url === "string") {
                        return (
                          <details key={i} style={{ marginBottom: 4, fontSize: "0.78rem" }}>
                            <summary style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", listStyle: "none" }}>
                              <span style={{ color: "var(--muted)", fontFamily: "monospace", minWidth: 42, textAlign: "right" }}>{secs}s</span>
                              <span>{icon}</span>
                              <img
                                src={evt.url}
                                alt="screenshot"
                                style={{ maxHeight: 40, borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)" }}
                              />
                              <span style={{ color: "var(--muted)" }}>Clica para expandir</span>
                            </summary>
                            <img
                              src={evt.url}
                              alt="screenshot"
                              style={{ maxWidth: "100%", marginTop: 6, borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)" }}
                            />
                          </details>
                        );
                      }
                      let label = String(evt.selector ?? "");
                      if (evt.type === "input" && evt.value) label += " → " + String(evt.value).slice(0, 50);
                      if (evt.type === "navigate") label = String(evt.pageUrl ?? "").replace(/https?:\/\/[^/]+/, "");
                      if (evt.type === "modal_open") label = t("feedback.timeline.opened") + String(evt.text ?? "").slice(0, 60);
                      if (evt.type === "modal_close") label = t("feedback.timeline.closed");
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
                      {t("feedback.element.title")}
                    </div>
                    <div>{ctx.selector}</div>
                    {ctx.text && (
                      <div style={{ color: "var(--muted)", marginTop: 2 }}>
                        {t("feedback.element.text", { text: ctx.text.slice(0, 100) })}
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

            {item.screenshotUrl && (
              <details style={{ marginBottom: 8 }}>
                <summary style={{ fontSize: "0.78rem", color: "var(--muted)", cursor: "pointer" }}>
                  📸 Screenshot
                </summary>
                <img
                  src={item.screenshotUrl}
                  alt="Screenshot"
                  style={{ maxWidth: "100%", marginTop: 6, borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </details>
            )}

            <TriageForm item={item} />

            {item.status !== "converted" && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {classifications.map((c) => (
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
                  disabled={pending === item.id || !item.priority || !!item.taskId}
                  title={!item.priority ? "Define severidade antes de converter" : undefined}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 4,
                    border: "1px solid var(--accent)",
                    background: "transparent",
                    color: item.priority && !item.taskId ? "var(--accent)" : "var(--muted)",
                    fontSize: "0.78rem",
                    cursor: item.priority && !item.taskId ? "pointer" : "not-allowed",
                    opacity: item.priority && !item.taskId ? 1 : 0.5,
                    marginLeft: "auto",
                  }}
                >
                  {t("feedback.item.create_task")}
                </button>
                <HandoffControls
                  item={item}
                  pending={pending === item.id}
                  onSend={() => handleSendToProducer(item.id)}
                />
                <ItemActionButton
                  onClick={() => handleArchive(item.id)}
                  disabled={pending === item.id}
                  color="var(--muted)"
                  title="Arquivar item (esconder da lista, recuperável)"
                  label="🗄 Arquivar"
                />
                <ItemActionButton
                  onClick={() => setConfirmDelete(item.id)}
                  disabled={pending === item.id || !!item.taskId}
                  color={item.taskId ? "var(--muted)" : "#E53935"}
                  title={
                    item.taskId
                      ? "Item ligado a uma tarefa — arquiva em vez de apagar"
                      : "Apagar permanentemente (inclui áudio e screenshots)"
                  }
                  label="🗑 Apagar"
                />
              </div>
            )}
          </div>
          );
        })}
      </div>
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) return handleDelete(confirmDelete);
        }}
        title="Apagar item de feedback?"
        message="Esta acção é permanente e remove o áudio e screenshots do disco. Para esconder sem apagar, usa Arquivar."
        confirmLabel="Apagar"
        destructive
        loading={pending === confirmDelete}
      />
    </>
  );
}

function TriageForm({ item }: { item: ItemData }) {
  const [open, setOpen] = useState(!item.triagedAt);
  const [saving, setSaving] = useState(false);
  const [priority, setPriority] = useState<FeedbackPriority | "">(
    (item.priority as FeedbackPriority | null) ?? ""
  );
  const [expected, setExpected] = useState(item.expectedResult ?? "");
  const [actual, setActual] = useState(item.actualResult ?? "");
  const [steps, setSteps] = useState<string[]>(item.reproSteps);
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>(item.acceptanceCriteria);

  const aiDrafted = !!item.aiDraftedAt;
  const triaged = !!item.triagedAt;

  async function handleSave() {
    if (!priority) {
      toast.error("Escolhe uma severidade (P0–P3)");
      return;
    }
    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
    const cleanCriteria = criteria
      .map((c) => ({ text: c.text.trim(), done: c.done }))
      .filter((c) => c.text);

    setSaving(true);
    const r = await updateFeedbackItemTriage(item.id, {
      priority,
      expectedResult: expected.trim() || null,
      actualResult: actual.trim() || null,
      reproSteps: cleanSteps,
      acceptanceCriteria: cleanCriteria,
    });
    setSaving(false);
    if ("error" in r) toast.error(r.error);
    else {
      toast.success("Triagem guardada");
      setOpen(false);
    }
  }

  const headerColor = triaged ? "#4CAF50" : aiDrafted ? "#F9A825" : "var(--muted)";
  const headerLabel = triaged
    ? `✓ Triado${priority ? ` · ${SEVERITY_LABELS[priority]}` : ""}`
    : aiDrafted
      ? "🤖 Draft AI · por confirmar"
      : "Por triar";

  return (
    <div style={{ marginTop: 8, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "8px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(255,255,255,0.02)",
          border: "none",
          cursor: "pointer",
          color: headerColor,
          fontSize: "0.82rem",
          fontWeight: 600,
        }}
      >
        <span>{headerLabel}</span>
        <span>{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
              Severidade
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FEEDBACK_PRIORITY_VALUES.map((sev) => (
                <button
                  key={sev}
                  onClick={() => setPriority(sev)}
                  title={SEVERITY_DESCRIPTIONS[sev]}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 4,
                    border: priority === sev ? `2px solid ${SEVERITY_COLORS[sev]}` : "1px solid rgba(255,255,255,0.1)",
                    background: priority === sev ? SEVERITY_COLORS[sev] + "33" : "transparent",
                    color: priority === sev ? SEVERITY_COLORS[sev] : "var(--muted)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {SEVERITY_LABELS[sev]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
              Resultado esperado {aiDrafted && !triaged && <span style={{ color: "#F9A825" }}>(draft AI)</span>}
            </label>
            <textarea
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              rows={2}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 4,
                padding: "6px 8px",
                color: "var(--text)",
                fontSize: "0.82rem",
                fontFamily: "inherit",
                resize: "vertical",
              }}
              placeholder="O que devia acontecer"
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
              Resultado actual {aiDrafted && !triaged && <span style={{ color: "#F9A825" }}>(draft AI)</span>}
            </label>
            <textarea
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              rows={2}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 4,
                padding: "6px 8px",
                color: "var(--text)",
                fontSize: "0.82rem",
                fontFamily: "inherit",
                resize: "vertical",
              }}
              placeholder="O que aconteceu realmente"
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
              Passos para reproduzir {aiDrafted && !triaged && <span style={{ color: "#F9A825" }}>(draft AI)</span>}
            </label>
            {steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                <span style={{ color: "var(--muted)", fontSize: "0.78rem", minWidth: 22, paddingTop: 6 }}>{i + 1}.</span>
                <input
                  value={s}
                  onChange={(e) => setSteps(steps.map((x, j) => (j === i ? e.target.value : x)))}
                  style={{
                    flex: 1,
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 4,
                    padding: "4px 8px",
                    color: "var(--text)",
                    fontSize: "0.82rem",
                  }}
                  placeholder="Acção do utilizador"
                />
                {steps.length > 1 && (
                  <button
                    onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                    style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.9rem" }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setSteps([...steps, ""])}
              style={{
                background: "transparent",
                border: "1px dashed rgba(255,255,255,0.15)",
                borderRadius: 4,
                padding: "3px 10px",
                color: "var(--muted)",
                fontSize: "0.75rem",
                cursor: "pointer",
                marginTop: 4,
              }}
            >
              + passo
            </button>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
              Critérios de aceitação {aiDrafted && !triaged && <span style={{ color: "#F9A825" }}>(draft AI)</span>}
            </label>
            {criteria.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={(e) => setCriteria(criteria.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))}
                />
                <input
                  value={c.text}
                  onChange={(e) => setCriteria(criteria.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  style={{
                    flex: 1,
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 4,
                    padding: "4px 8px",
                    color: "var(--text)",
                    fontSize: "0.82rem",
                  }}
                  placeholder="Critério verificável"
                />
                {criteria.length > 1 && (
                  <button
                    onClick={() => setCriteria(criteria.filter((_, j) => j !== i))}
                    style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.9rem" }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setCriteria([...criteria, { text: "", done: false }])}
              style={{
                background: "transparent",
                border: "1px dashed rgba(255,255,255,0.15)",
                borderRadius: 4,
                padding: "3px 10px",
                color: "var(--muted)",
                fontSize: "0.75rem",
                cursor: "pointer",
                marginTop: 4,
              }}
            >
              + critério
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
            <button
              onClick={handleSave}
              disabled={saving || !priority}
              style={{
                padding: "5px 14px",
                borderRadius: 4,
                border: "1px solid var(--green)",
                background: "var(--green)",
                color: "#fff",
                fontSize: "0.8rem",
                cursor: priority && !saving ? "pointer" : "not-allowed",
                opacity: priority && !saving ? 1 : 0.5,
                fontWeight: 600,
              }}
            >
              {saving ? "A guardar..." : triaged ? "Actualizar triagem" : "Confirmar triagem"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemActionButton({
  onClick,
  disabled,
  color,
  title,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  color: string;
  title: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: "3px 10px",
        borderRadius: 4,
        border: `1px solid ${color}`,
        background: "transparent",
        color,
        fontSize: "0.78rem",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

const HANDOFF_LABELS: Record<HandoffStatus, { label: string; color: string }> = {
  [HANDOFF_STATUS.QUEUED]: { label: "→ Bruno: em fila", color: "#F9A825" },
  [HANDOFF_STATUS.DELIVERED]: { label: "→ Bruno: entregue", color: "#F9A825" },
  [HANDOFF_STATUS.IN_PROGRESS]: { label: "→ Bruno: a trabalhar", color: "#378ADD" },
  [HANDOFF_STATUS.RESOLVED]: { label: "→ Bruno: resolvido", color: "#4CAF50" },
  [HANDOFF_STATUS.REJECTED]: { label: "→ Bruno: rejeitado", color: "#E53935" },
};

function HandoffControls({
  item,
  pending,
  onSend,
}: {
  item: ItemData;
  pending: boolean;
  onSend: () => void;
}) {
  const status = item.handoffStatus as HandoffStatus | null;

  if (status && HANDOFF_LABELS[status]) {
    const { label, color } = HANDOFF_LABELS[status];
    return (
      <span
        style={{
          padding: "3px 10px",
          borderRadius: 4,
          background: `${color}20`,
          color,
          fontSize: "0.78rem",
          fontWeight: 600,
        }}
        title={
          status === "resolved" && item.handoffResolvedAt
            ? `Resolvido em ${new Date(item.handoffResolvedAt).toLocaleString("pt-PT")}`
            : undefined
        }
      >
        {label}
      </span>
    );
  }

  const enabled = !!item.priority && !pending;
  return (
    <button
      onClick={onSend}
      disabled={!enabled}
      title={!item.priority ? "Define severidade antes de enviar ao produtor" : undefined}
      style={{
        padding: "3px 10px",
        borderRadius: 4,
        border: "1px solid #9C27B0",
        background: "transparent",
        color: enabled ? "#9C27B0" : "var(--muted)",
        fontSize: "0.78rem",
        cursor: enabled ? "pointer" : "not-allowed",
        opacity: enabled ? 1 : 0.5,
      }}
    >
      → Enviar ao produtor
    </button>
  );
}
