"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface ExportButtonProps {
  type: "projects" | "timesheets" | "pipeline" | "people" | "investments";
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  formats?: ("pdf" | "excel")[];
}

export function ExportButton({
  type,
  projectId,
  dateFrom,
  dateTo,
  formats = ["excel", "pdf"],
}: ExportButtonProps) {
  const t = useT();
  const [loading, setLoading] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleExport(format: "pdf" | "excel") {
    setLoading(format);
    setOpen(false);

    const params = new URLSearchParams({ type, format });
    if (projectId) params.set("projectId", projectId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    try {
      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro" }));
        alert(err.error ?? "Erro ao exportar");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? `export.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erro ao exportar");
    } finally {
      setLoading(null);
    }
  }

  if (formats.length === 1) {
    const fmt = formats[0];
    return (
      <button
        onClick={() => handleExport(fmt)}
        disabled={!!loading}
        className="cc-btn cc-btn-secondary"
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <Download size={16} />
        {loading ? t("export.generating") : t(fmt === "pdf" ? "export.pdf" : "export.excel")}
      </button>
    );
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={!!loading}
        className="cc-btn cc-btn-secondary"
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <Download size={16} />
        {loading ? t("export.generating") : t("export.title")}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            background: "var(--cc-bg, #fff)",
            border: "1px solid var(--cc-border, #e0e0e0)",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 50,
            minWidth: 160,
          }}
        >
          {formats.includes("pdf") && (
            <button
              onClick={() => handleExport("pdf")}
              className="cc-dropdown-item"
              style={{ display: "block", width: "100%", padding: "8px 16px", textAlign: "left", border: "none", background: "none", cursor: "pointer" }}
            >
              {t("export.pdf")}
            </button>
          )}
          {formats.includes("excel") && (
            <button
              onClick={() => handleExport("excel")}
              className="cc-dropdown-item"
              style={{ display: "block", width: "100%", padding: "8px 16px", textAlign: "left", border: "none", background: "none", cursor: "pointer" }}
            >
              {t("export.excel")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
