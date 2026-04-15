"use client";

import { useActionState, useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { saveLLMConfig } from "@/lib/actions/settings-actions";
import { LLM_PROVIDER_OPTIONS } from "@/lib/validation/llm-config-schema";
import { toast } from "sonner";

interface Props {
  current: {
    provider: string;
    endpoint: string;
    model: string;
    maxTokens: number;
    temperature: number;
    hasApiKey: boolean;
  } | null;
}

export function LLMConfigForm({ current }: Props) {
  const t = useT();
  const [provider, setProvider] = useState(current?.provider ?? "minimax");

  const [state, action, pending] = useActionState(saveLLMConfig, undefined);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(t("settings.llm_saved"));
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state, t]);

  const providerInfo = LLM_PROVIDER_OPTIONS.find((p) => p.value === provider);

  return (
    <form action={action}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          {t("settings.llm_provider")}
        </label>
        <select
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="cc-input"
          style={{ width: "100%" }}
        >
          {LLM_PROVIDER_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {providerInfo?.needsEndpoint && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("settings.llm_endpoint")}
          </label>
          <input
            name="endpoint"
            defaultValue={current?.endpoint ?? ""}
            placeholder="https://..."
            className="cc-input"
            style={{ width: "100%" }}
          />
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          {t("settings.llm_model")}
        </label>
        <input
          name="model"
          defaultValue={current?.model ?? "default"}
          className="cc-input"
          style={{ width: "100%" }}
        />
        <span style={{ fontSize: 12, color: "#999" }}>
          &quot;default&quot; usa o modelo recomendado para o fornecedor
        </span>
      </div>

      {providerInfo?.needsApiKey && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("settings.llm_api_key")}
          </label>
          <input
            name="apiKey"
            type="password"
            placeholder={current?.hasApiKey ? "••••••••" : "sk-..."}
            className="cc-input"
            style={{ width: "100%" }}
          />
          {current?.hasApiKey && (
            <span style={{ fontSize: 12, color: "#999" }}>
              Deixa vazio para manter a chave actual
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("settings.llm_max_tokens")}
          </label>
          <input
            name="maxTokens"
            type="number"
            defaultValue={current?.maxTokens ?? 4096}
            min={256}
            max={32768}
            className="cc-input"
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("settings.llm_temperature")}
          </label>
          <input
            name="temperature"
            type="number"
            step="0.1"
            defaultValue={current?.temperature ?? 0.7}
            min={0}
            max={2}
            className="cc-input"
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <button type="submit" disabled={pending} className="cc-btn cc-btn-primary">
        {pending ? "..." : t("common.save")}
      </button>
    </form>
  );
}
