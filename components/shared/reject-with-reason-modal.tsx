"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "./modal";
import type { ActionResult } from "@/lib/actions/types";

type ActionFn = (
  prev: ActionResult | undefined,
  formData: FormData,
) => Promise<ActionResult>;

type Props = {
  open: boolean;
  onClose: () => void;
  action: ActionFn;
  feedbackItemId: string;
  title: string;
  placeholder: string;
  successMessage: string;
  submitLabel: string;
  rows?: number;
};

/**
 * Modal partilhado entre o flow de aprovação (F3) e de verificação (F5)
 * para capturar uma razão obrigatória (min 3 chars) antes de submeter uma
 * acção de rejeição. A Zod-side já partilha `rejectionReasonField`
 * (lib/validation/feedback-approval.ts) — este componente DRY-a o lado UI.
 */
export function RejectWithReasonModal({
  open,
  onClose,
  action,
  feedbackItemId,
  title,
  placeholder,
  successMessage,
  submitLabel,
  rows = 4,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (!state) return;
    if ("error" in state) toast.error(state.error);
    else {
      toast.success(successMessage);
      onClose();
      router.refresh();
    }
  }, [state, onClose, router, successMessage]);

  return (
    <Modal open={open} onClose={onClose} title={title} width={480}>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="hidden" name="feedbackItemId" value={feedbackItemId} />
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <span>Motivo (mínimo 3 chars)</span>
          <textarea
            name="rejectionReason"
            required
            minLength={3}
            maxLength={2000}
            rows={rows}
            className="cc-input"
            placeholder={placeholder}
          />
        </label>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="cc-button-ghost" disabled={pending}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--red)",
              background: "var(--red)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {pending ? "A enviar…" : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
