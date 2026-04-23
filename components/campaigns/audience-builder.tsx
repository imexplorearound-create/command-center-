"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";
import type { AudienceFilter } from "@/lib/validation/campaign-schema";

interface Props {
  filter: AudienceFilter;
  onChange: (filter: AudienceFilter) => void;
  areas: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}

export function AudienceBuilder({ filter, onChange, areas, projects }: Props) {
  const t = useT();
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Preview audience count when filter changes
  useEffect(() => {
    const timeout = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const params = new URLSearchParams({ filter: JSON.stringify(filter) });
        const res = await fetch(`/api/export?type=people&format=excel&preview=count&${params}`);
        // This is a rough preview — we'll just show the count
        if (res.ok) {
          // For now just indicate filter is set
          setPreviewCount(null);
        }
      } catch {
        // ignore
      }
      setPreviewLoading(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [filter]);

  function toggleRole(role: string) {
    const current = filter.roles ?? [];
    const next = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    onChange({ ...filter, roles: next.length > 0 ? next : undefined });
  }

  function setAreaIds(ids: string[]) {
    onChange({ ...filter, areaIds: ids.length > 0 ? ids : undefined });
  }

  function setProjectIds(ids: string[]) {
    onChange({ ...filter, projectIds: ids.length > 0 ? ids : undefined });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Roles */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, display: "block" }}>
          {t("campaign.filter_roles")}
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {["admin", "manager", "membro", "cliente"].map((role) => (
            <label key={role} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={filter.roles?.includes(role) ?? false}
                onChange={() => toggleRole(role)}
              />
              {role}
            </label>
          ))}
        </div>
      </div>

      {/* Areas */}
      {areas.length > 0 && (
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, display: "block" }}>
            {t("campaign.filter_areas")}
          </label>
          <select
            multiple
            value={filter.areaIds ?? []}
            onChange={(e) => setAreaIds(Array.from(e.target.selectedOptions, (o) => o.value))}
            className="cc-input"
            style={{ minHeight: 80 }}
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, display: "block" }}>
            {t("campaign.filter_projects")}
          </label>
          <select
            multiple
            value={filter.projectIds ?? []}
            onChange={(e) => setProjectIds(Array.from(e.target.selectedOptions, (o) => o.value))}
            className="cc-input"
            style={{ minHeight: 80 }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Preview */}
      <div style={{ fontSize: 13, color: "#666" }}>
        {previewLoading ? "..." : previewCount !== null ? t("campaign.audience_count", { count: previewCount }) : ""}
        {!filter.roles?.length && !filter.areaIds?.length && !filter.projectIds?.length && (
          <span>Todas as pessoas com email</span>
        )}
      </div>
    </div>
  );
}
