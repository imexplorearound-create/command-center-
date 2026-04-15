"use client";

import { useState } from "react";
import { ProjectEditModal } from "./project-edit-modal";

export function NewProjectButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "var(--accent-glow, rgba(74,168,136,0.15))",
          color: "var(--accent, #4a8)",
          cursor: "pointer",
          fontSize: "0.78rem",
          fontWeight: 600,
        }}
      >
        + Novo Projecto
      </button>
      <ProjectEditModal open={open} onClose={() => setOpen(false)} mode="create" />
    </>
  );
}
