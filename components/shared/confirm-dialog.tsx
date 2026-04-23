"use client";

import { Modal } from "./modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={420}>
      <p style={{ margin: "0 0 20px", fontSize: "0.88rem", color: "var(--text-secondary, #ccc)" }}>
        {message}
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "transparent",
            color: "var(--text, #fff)",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "0.85rem",
          }}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "none",
            background: destructive ? "var(--red, #e54)" : "var(--accent, #4a8)",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "0.85rem",
            fontWeight: 600,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
