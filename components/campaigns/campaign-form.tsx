"use client";

import { useActionState, useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { createCampaign } from "@/lib/actions/campaign-actions";
import { AudienceBuilder } from "./audience-builder";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { AudienceFilter } from "@/lib/validation/campaign-schema";

interface Props {
  templates: { id: string; name: string; subject: string; htmlContent: string }[];
  areas: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}

export function CampaignForm({ templates, areas, projects }: Props) {
  const t = useT();
  const router = useRouter();
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  const [state, action, pending] = useActionState(createCampaign, undefined);

  useEffect(() => {
    if (state && "success" in state && state.data) {
      toast.success("Campanha criada");
      router.push(`/crm/campaigns/${state.data.id}`);
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state, router]);

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplate(templateId);
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject);
      setContent(tpl.htmlContent);
    }
  }

  return (
    <form action={action}>
      <input type="hidden" name="audienceFilter" value={JSON.stringify(audienceFilter)} />
      {selectedTemplate && <input type="hidden" name="templateId" value={selectedTemplate} />}

      {/* Name */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          {t("campaign.name")}
        </label>
        <input name="name" required className="cc-input" style={{ width: "100%" }} />
      </div>

      {/* Template select */}
      {templates.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("campaign.template")}
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="cc-input"
            style={{ width: "100%" }}
          >
            <option value="">{t("campaign.select_template")}</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Subject */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          {t("campaign.subject")}
        </label>
        <input
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="cc-input"
          style={{ width: "100%" }}
        />
      </div>

      {/* Content */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          {t("campaign.content")}
        </label>
        <textarea
          name="htmlContent"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          className="cc-input"
          rows={12}
          style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }}
          placeholder="Markdown ou HTML. Variáveis: {{nome}}, {{email}}"
        />
      </div>

      {/* Audience */}
      <div style={{ marginBottom: 16, padding: 16, border: "1px solid var(--cc-border, #e0e0e0)", borderRadius: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          {t("campaign.audience")}
        </h3>
        <AudienceBuilder
          filter={audienceFilter}
          onChange={setAudienceFilter}
          areas={areas}
          projects={projects}
        />
      </div>

      {/* Schedule */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          {t("campaign.schedule")} (opcional)
        </label>
        <input
          name="scheduledAt"
          type="datetime-local"
          className="cc-input"
        />
      </div>

      <button type="submit" disabled={pending} className="cc-btn cc-btn-primary">
        {pending ? "..." : t("common.create")}
      </button>
    </form>
  );
}
