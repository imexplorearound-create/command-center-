"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import {
  verifyFeedback,
  rejectVerification,
} from "@/lib/actions/feedback-approval-actions";
import { RejectWithReasonModal } from "@/components/shared/reject-with-reason-modal";
import type { VerificationQueueItem } from "@/lib/queries/verification-queue";

type Props = {
  item: VerificationQueueItem;
  flagged: boolean;
};

export function VerificationCard({ item, flagged }: Props) {
  const router = useRouter();
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyFeedback,
    undefined,
  );
  const [showReject, setShowReject] = useState(false);

  useEffect(() => {
    if (!verifyState) return;
    if ("error" in verifyState) toast.error(verifyState.error);
    else {
      toast.success("Verificado — ciclo fechado");
      router.refresh();
    }
  }, [verifyState, router]);

  return (
    <article
      className="cc-card"
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        borderLeft: flagged ? "3px solid var(--yellow)" : undefined,
      }}
    >
      <header style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 12, color: "var(--muted, #888)", marginBottom: 2 }}>
            {item.projectName} · {item.projectSlug}
          </div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            {item.testCaseCode && (
              <code
                style={{
                  fontSize: 12,
                  fontFamily: "monospace",
                  background: "var(--card, #fff)",
                  border: "1px solid var(--border)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  marginRight: 8,
                }}
              >
                {item.testCaseCode}
              </code>
            )}
            {item.taskTitle}
          </h2>
          {item.testCaseTitle && (
            <div style={{ fontSize: 12, color: "var(--muted, #888)", marginTop: 2 }}>
              Caso: {item.testCaseTitle}
            </div>
          )}
        </div>

        {flagged && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--yellow)",
              background: "var(--yellow-glow)",
              padding: "4px 8px",
              borderRadius: 4,
            }}
            title="Já foi rejeitado 3+ vezes — ping-pong"
          >
            <AlertTriangle size={12} /> {item.verifyRejectionsCount}× rejeitado
          </div>
        )}
      </header>

      {item.voiceTranscript && (
        <div style={{ fontSize: 13, color: "var(--text)" }}>
          <strong style={{ fontSize: 11, color: "var(--muted, #888)", textTransform: "uppercase" }}>
            Relato original
          </strong>
          <p style={{ margin: "4px 0 0", fontStyle: "italic" }}>
            &ldquo;{item.voiceTranscript}&rdquo;
          </p>
        </div>
      )}

      {(item.expectedResult || item.actualResult) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
          {item.expectedResult && (
            <div>
              <strong style={{ fontSize: 11, color: "var(--green)", textTransform: "uppercase" }}>
                Esperado
              </strong>
              <p style={{ margin: "4px 0 0" }}>{item.expectedResult}</p>
            </div>
          )}
          {item.actualResult && (
            <div>
              <strong style={{ fontSize: 11, color: "var(--red)", textTransform: "uppercase" }}>
                Actual (no relato)
              </strong>
              <p style={{ margin: "4px 0 0" }}>{item.actualResult}</p>
            </div>
          )}
        </div>
      )}

      {item.reproSteps.length > 0 && (
        <div style={{ fontSize: 13 }}>
          <strong style={{ fontSize: 11, color: "var(--muted, #888)", textTransform: "uppercase" }}>
            Passos
          </strong>
          <ol style={{ margin: "4px 0 0", paddingLeft: 20 }}>
            {item.reproSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}

      {item.pageUrl && (
        <div style={{ fontSize: 12, color: "var(--muted, #888)" }}>
          Página: <code>{item.pageUrl}</code>
        </div>
      )}

      <footer style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        <form action={verifyAction}>
          <input type="hidden" name="feedbackItemId" value={item.feedbackItemId} />
          <button
            type="submit"
            disabled={verifyPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid var(--green)",
              background: "var(--green)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <CheckCircle2 size={14} /> {verifyPending ? "A verificar…" : "Está resolvido"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setShowReject(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 6,
            border: "1px solid var(--red)",
            background: "transparent",
            color: "var(--red)",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <XCircle size={14} /> Ainda não está
        </button>
      </footer>

      <RejectWithReasonModal
        open={showReject}
        onClose={() => setShowReject(false)}
        action={rejectVerification}
        feedbackItemId={item.feedbackItemId}
        title="Ainda não está resolvido"
        placeholder="Ex: em Safari continua a falhar; o botão X ainda não mostra feedback visual…"
        successMessage="Devolvido ao developer"
        submitLabel="Devolver ao developer"
        rows={5}
      />
    </article>
  );
}
