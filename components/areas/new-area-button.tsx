"use client";

import { useState } from "react";
import type { PersonOption } from "@/lib/types";
import { AreaFormModal } from "./area-form-modal";

export function NewAreaButton({ people }: { people: PersonOption[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
        + Nova área
      </button>
      {open && (
        <AreaFormModal mode="create" people={people} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
