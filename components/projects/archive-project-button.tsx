"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { archiveProject } from "@/lib/actions/project-actions";

interface Props {
  slug: string;
  projectName: string;
}

export function ArchiveProjectButton({ slug, projectName }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await archiveProject(slug);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Projecto "${projectName}" arquivado`);
      setOpen(false);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Arquivar projecto"
        aria-label="Arquivar projecto"
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
        🗄
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Arquivar projecto"
        message={`Tens a certeza que queres arquivar "${projectName}"? O projecto deixa de aparecer nas listagens, mas pode ser restaurado mais tarde. Bloqueado se houver tasks activas.`}
        confirmLabel="Arquivar"
        destructive
        loading={pending}
      />
    </>
  );
}
