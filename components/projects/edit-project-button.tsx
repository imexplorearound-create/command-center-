"use client";

import { useState } from "react";
import { ProjectEditModal } from "./project-edit-modal";
import type { ProjectFormValues } from "./project-form-fields";

interface Props {
  project: ProjectFormValues & { slug: string };
}

export function EditProjectButton({ project }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Editar projecto"
        aria-label="Editar projecto"
        style={{
          padding: "6px 8px",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "transparent",
          color: "var(--muted, #999)",
          cursor: "pointer",
          fontSize: "0.85rem",
          lineHeight: 1,
        }}
      >
        ✎
      </button>
      <ProjectEditModal
        open={open}
        onClose={() => setOpen(false)}
        mode="edit"
        initial={project}
      />
    </>
  );
}
