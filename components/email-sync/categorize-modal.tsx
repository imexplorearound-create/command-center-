"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import {
  formInputStyle,
  formButtonStyle,
  formButtonPrimaryStyle,
  formButtonDangerStyle,
} from "@/components/shared/form-styles";
import type { EmailRecordData } from "@/lib/types";
import { categorizeEmail, rejectEmailCategorization } from "@/lib/actions/email-record-actions";

interface Props {
  email: EmailRecordData;
  projects: { id: string; name: string }[];
  clients: { id: string; companyName: string }[];
  people: { id: string; name: string }[];
  onClose: () => void;
}

export function CategorizeModal({ email, projects, clients, people, onClose }: Props) {
  const [state, formAction, pending] = useActionState(categorizeEmail, undefined);
  const [rejectPending, setRejectPending] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Email categorizado");
      onClose();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleReject() {
    setRejectPending(true);
    const result = await rejectEmailCategorization(email.id);
    setRejectPending(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Email rejeitado");
      onClose();
    }
  }

  return (
    <Modal open onClose={onClose} title="Categorizar email" width={560}>
      {/* Read-only email info */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          background: "var(--bg-subtle, rgba(255,255,255,0.04))",
          borderRadius: 8,
          border: "1px solid var(--border, rgba(255,255,255,0.06))",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 6 }}>
          {email.subject || "(sem assunto)"}
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--muted, #999)", marginBottom: 2 }}>
          <strong>De:</strong> {email.from}
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--muted, #999)", marginBottom: 2 }}>
          <strong>Para:</strong> {email.to.join(", ")}
        </div>
        {email.snippet && (
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--muted, #999)",
              marginTop: 8,
              lineHeight: 1.5,
              fontStyle: "italic",
            }}
          >
            {email.snippet}
          </div>
        )}
      </div>

      {/* Categorization form */}
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input type="hidden" name="id" value={email.id} />

        <FormField label="Projecto">
          <select
            name="projectId"
            defaultValue={email.projectId ?? ""}
            style={formInputStyle}
          >
            <option value="">-- Sem projecto --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Cliente">
          <select
            name="clientId"
            defaultValue={email.clientId ?? ""}
            style={formInputStyle}
          >
            <option value="">-- Sem cliente --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Pessoa">
          <select
            name="personId"
            defaultValue={email.personId ?? ""}
            style={formInputStyle}
          >
            <option value="">-- Sem pessoa --</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </FormField>

        {/* Footer buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            type="button"
            onClick={handleReject}
            disabled={pending || rejectPending}
            style={{ ...formButtonStyle, ...formButtonDangerStyle }}
          >
            {rejectPending ? "A rejeitar..." : "Rejeitar"}
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              style={formButtonStyle}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || rejectPending}
              style={{ ...formButtonStyle, ...formButtonPrimaryStyle }}
            >
              {pending ? "A guardar..." : "Categorizar"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
