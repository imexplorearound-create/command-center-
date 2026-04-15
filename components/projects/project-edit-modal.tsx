"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/shared/modal";
import { ProjectFormFields, type ProjectFormValues } from "./project-form-fields";
import { createProject, updateProject } from "@/lib/actions/project-actions";

interface Props {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  initial?: Partial<ProjectFormValues> & { slug?: string };
}

export function ProjectEditModal({ open, onClose, mode, initial }: Props) {
  const router = useRouter();
  const action = mode === "create" ? createProject : updateProject;

  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (!state) return;
    if ("error" in state) {
      toast.error(state.error);
      return;
    }
    if (state.success) {
      toast.success(mode === "create" ? "Projecto criado" : "Projecto actualizado");
      onClose();
      if (state.data && "slug" in state.data) {
        if (mode === "create" || state.data.slug !== initial?.slug) {
          router.push(`/project/${state.data.slug}`);
        }
        // mesmo slug: revalidatePath() server-side já invalidou; nada a fazer no cliente
      }
    }
  }, [state, mode, onClose, router, initial?.slug]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Novo Projecto" : "Editar Projecto"}
    >
      <form action={formAction}>
        {mode === "edit" && initial?.slug && (
          <input type="hidden" name="currentSlug" value={initial.slug} />
        )}
        <ProjectFormFields initial={initial} mode={mode} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "var(--text, #fff)",
              cursor: pending ? "not-allowed" : "pointer",
              fontSize: "0.85rem",
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: "var(--accent, #4a8)",
              color: "#fff",
              cursor: pending ? "not-allowed" : "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? "A guardar..." : mode === "create" ? "Criar" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
