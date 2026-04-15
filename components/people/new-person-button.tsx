"use client";

import { useState } from "react";
import { PersonFormModal } from "./person-form-modal";

export function NewPersonButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cc-btn-primary"
        style={{
          background: "var(--accent, #378ADD)",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: 6,
          fontSize: "0.85rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        + Nova pessoa
      </button>
      {open && <PersonFormModal mode="create" onClose={() => setOpen(false)} />}
    </>
  );
}
