"use client";

import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { CopyButton } from "@/components/shared/copy-button";

type IntegrationKey = "smtp" | "llm" | "groq" | "github" | "gmail" | "telegram" | "whatsapp";

interface Integration {
  key: IntegrationKey;
  envVars: string[];
}

const INTEGRATIONS: Integration[] = [
  { key: "smtp",     envVars: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] },
  { key: "llm",      envVars: ["MAESTRO_PROVIDER", "MAESTRO_API_KEY", "MAESTRO_MODEL"] },
  { key: "groq",     envVars: ["GROQ_API_KEY"] },
  { key: "github",   envVars: ["GITHUB_TOKEN", "GITHUB_WEBHOOK_SECRET"] },
  { key: "gmail",    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"] },
  { key: "telegram", envVars: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"] },
  { key: "whatsapp", envVars: ["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_VERIFY_TOKEN"] },
];

export function StepIntegrations({ onSuccess }: { onSuccess: () => void }) {
  const t = useT();
  const [selected, setSelected] = useState<Set<string>>(new Set(["smtp", "llm"]));

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const envTemplate = useMemo(() => {
    const lines: string[] = ["# Command Center\n"];
    for (const int of INTEGRATIONS) {
      if (!selected.has(int.key)) continue;
      lines.push(`# ${t(`onboarding.integrations.${int.key}.label`)} — ${t(`onboarding.integrations.${int.key}.description`)}`);
      for (const v of int.envVars) lines.push(`${v}=`);
      lines.push("");
    }
    return lines.join("\n");
  }, [selected, t]);

  return (
    <div>
      <p style={{ marginBottom: 16, color: "#666" }}>{t("onboarding.integrations.intro")}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {INTEGRATIONS.map((int) => {
          const isSelected = selected.has(int.key);
          return (
            <label
              key={int.key}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "12px 16px",
                border: `1px solid ${isSelected ? "var(--cc-primary, #3b82f6)" : "var(--cc-border, #e0e0e0)"}`,
                borderRadius: 8,
                cursor: "pointer",
                background: isSelected ? "var(--cc-primary-bg, #eff6ff)" : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggle(int.key)} />
                <span style={{ fontWeight: 600 }}>{t(`onboarding.integrations.${int.key}.label`)}</span>
              </div>
              <div style={{ fontSize: 12, color: "#666", paddingLeft: 24 }}>
                {t(`onboarding.integrations.${int.key}.description`)}
              </div>
              {isSelected && (
                <div
                  style={{
                    marginTop: 4,
                    marginLeft: 24,
                    padding: 8,
                    background: "var(--cc-code-bg, #f4f4f5)",
                    borderRadius: 4,
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: "#444",
                  }}
                >
                  {int.envVars.map((v) => (
                    <div key={v}>
                      {v}=<span style={{ color: "#999" }}>&lt;valor&gt;</span>
                    </div>
                  ))}
                </div>
              )}
            </label>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 8, alignItems: "center" }}>
        <CopyButton
          value={envTemplate}
          toastLabel=".env"
          disabled={selected.size === 0}
        >
          {t("onboarding.integrations.copy_template")}
        </CopyButton>
        <button type="button" onClick={onSuccess} className="cc-btn cc-btn-primary">
          {t("onboarding.integrations.continue")}
        </button>
      </div>
    </div>
  );
}
