"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical } from "lucide-react";
import { archiveSession, unarchiveSession, deleteSession } from "@/lib/actions/feedback-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useT } from "@/lib/i18n/context";

interface Props {
  sessionId: string;
  archived: boolean;
  onDeleted?: () => void;
}

export function SessionActions({ sessionId, archived, onDeleted }: Props) {
  const t = useT();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  async function handleArchiveToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    setPending(true);
    const r = archived ? await unarchiveSession(sessionId) : await archiveSession(sessionId);
    setPending(false);
    if ("error" in r) toast.error(r.error);
    else {
      toast.success(t(archived ? "feedback.unarchived_ok" : "feedback.archived_ok"));
      router.refresh();
    }
  }

  async function handleConfirmDelete() {
    setPending(true);
    const r = await deleteSession(sessionId);
    setPending(false);
    setConfirmOpen(false);
    if ("error" in r) toast.error(r.error);
    else {
      toast.success(t("feedback.deleted_ok"));
      if (onDeleted) onDeleted();
      else router.refresh();
    }
  }

  return (
    <div ref={rootRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
        disabled={pending}
        aria-label="menu"
        style={{
          padding: 4,
          borderRadius: 4,
          border: "none",
          background: "transparent",
          color: "var(--muted)",
          cursor: pending ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <MoreVertical size={16} />
      </button>

      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 180,
            background: "var(--cc-surface, #1a1a1a)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            padding: 4,
            zIndex: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <button
            type="button"
            onClick={handleArchiveToggle}
            style={menuItemStyle}
          >
            {t(archived ? "feedback.unarchive" : "feedback.archive")}
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); setConfirmOpen(true); }}
            style={{ ...menuItemStyle, color: "var(--red)" }}
          >
            {t("feedback.delete_permanent")}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t("feedback.delete_confirm_title")}
        message={t("feedback.delete_confirm_body")}
        confirmLabel={t("feedback.delete_permanent")}
        destructive
        loading={pending}
      />
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 12px",
  border: "none",
  background: "transparent",
  color: "var(--text)",
  fontSize: "0.85rem",
  cursor: "pointer",
  borderRadius: 4,
};
