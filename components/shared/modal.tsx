"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}

/**
 * Modal base usando &lt;dialog&gt; HTML nativo.
 * Reutilizável em todos os formulários CRUD.
 *
 * - Esc fecha (default do <dialog>)
 * - Click no backdrop fecha
 * - Bloqueia scroll do body quando aberto
 */
export function Modal({ open, onClose, title, children, width = 520 }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
      document.body.style.overflow = "hidden";
    }
    if (!open && dlg.open) {
      dlg.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={handleBackdropClick}
      style={{
        background: "var(--card, #151821)",
        color: "var(--text, #eaedf3)",
        border: "1px solid var(--border, rgba(255,255,255,0.1))",
        borderRadius: 12,
        padding: 0,
        width,
        maxWidth: "calc(100vw - 32px)",
        maxHeight: "calc(100vh - 32px)",
        margin: "auto",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--muted, #999)",
            cursor: "pointer",
            fontSize: "1.25rem",
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ padding: 20, maxHeight: "calc(100vh - 140px)", overflowY: "auto" }}>
        {children}
      </div>
    </dialog>
  );
}
