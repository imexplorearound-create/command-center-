"use client";

import { useState } from "react";
import {
  confirmValidation,
  editValidation,
  rejectValidation,
} from "@/lib/actions/validation";

export function ValidationActions({ itemId, title }: { itemId: string; title: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  if (done) return <div style={{ fontSize: "0.75rem", color: "var(--green)" }}>Processado</div>;

  if (editing) {
    return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 4,
            padding: "4px 8px",
            fontSize: "0.78rem",
            color: "var(--text)",
            width: 200,
          }}
        />
        <button
          className="cc-validation-btn cc-validation-btn-confirm"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            await editValidation(itemId, editTitle);
            setDone(true);
          }}
          title="Guardar"
        >
          ✓
        </button>
        <button
          className="cc-validation-btn"
          onClick={() => setEditing(false)}
          title="Cancelar"
        >
          ✗
        </button>
      </div>
    );
  }

  return (
    <div className="cc-validation-actions">
      <button
        className="cc-validation-btn cc-validation-btn-confirm"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          await confirmValidation(itemId);
          setDone(true);
        }}
        title="Confirmar"
      >
        ✓
      </button>
      <button
        className="cc-validation-btn"
        disabled={loading}
        onClick={() => setEditing(true)}
        title="Editar"
      >
        ✎
      </button>
      <button
        className="cc-validation-btn cc-validation-btn-reject"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          await rejectValidation(itemId);
          setDone(true);
        }}
        title="Rejeitar"
      >
        ✗
      </button>
    </div>
  );
}
