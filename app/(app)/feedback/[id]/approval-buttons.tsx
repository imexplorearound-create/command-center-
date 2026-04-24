"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Archive } from "lucide-react";
import {
  approveFeedback,
  rejectFeedback,
  archiveFeedback,
} from "@/lib/actions/feedback-approval-actions";
import { RejectWithReasonModal } from "@/components/shared/reject-with-reason-modal";
import type { ApprovalStatus } from "@/lib/validation/feedback-approval";

type Props = {
  feedbackItemId: string;
  approvalStatus: ApprovalStatus;
  hasTestCase: boolean;
};

export function ApprovalButtons({ feedbackItemId, approvalStatus, hasTestCase }: Props) {
  const router = useRouter();
  const [approveState, approveAction, approvePending] = useActionState(
    approveFeedback,
    undefined,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveFeedback,
    undefined,
  );
  const [showReject, setShowReject] = useState(false);

  useEffect(() => {
    if (!approveState) return;
    if ("error" in approveState) toast.error(approveState.error);
    else {
      toast.success("Aprovado — task criada/ligada");
      router.refresh();
    }
  }, [approveState, router]);

  useEffect(() => {
    if (!archiveState) return;
    if ("error" in archiveState) toast.error(archiveState.error);
    else {
      toast.success("Arquivado");
      router.refresh();
    }
  }, [archiveState, router]);

  if (approvalStatus !== "needs_review") {
    return (
      <div style={{ fontSize: 12, color: "var(--muted, #888)" }}>
        Estado: <strong>{approvalStatus}</strong>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <form action={approveAction}>
        <input type="hidden" name="feedbackItemId" value={feedbackItemId} />
        <button
          type="submit"
          disabled={approvePending || !hasTestCase}
          title={hasTestCase ? "Aprovar e criar/ligar task" : "Atribui primeiro um TestCase"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--green)",
            background: hasTestCase ? "var(--green)" : "var(--muted)",
            color: "#fff",
            cursor: hasTestCase ? "pointer" : "not-allowed",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={14} /> {approvePending ? "A aprovar…" : "Aprovar"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setShowReject(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid var(--red)",
          background: "transparent",
          color: "var(--red)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <XCircle size={14} /> Rejeitar
      </button>

      <form action={archiveAction}>
        <input type="hidden" name="feedbackItemId" value={feedbackItemId} />
        <button
          type="submit"
          disabled={archivePending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid var(--border, #d0d0d5)",
            background: "transparent",
            color: "var(--muted, #666)",
            cursor: "pointer",
            fontSize: 12,
          }}
          title="Arquivar (sem task)"
        >
          <Archive size={12} /> Arquivar
        </button>
      </form>

      <RejectWithReasonModal
        open={showReject}
        onClose={() => setShowReject(false)}
        action={rejectFeedback}
        feedbackItemId={feedbackItemId}
        title="Rejeitar feedback"
        placeholder="Ex: Duplicado de X, fora do scope, mal-entendido…"
        successMessage="Rejeitado"
        submitLabel="Rejeitar"
      />
    </div>
  );
}
