"use client";

import { useState, useActionState, useEffect } from "react";
import { useT } from "@/lib/i18n/context";
import { saveOnboardingStep5 } from "@/lib/actions/onboarding-actions";
import { toast } from "sonner";

interface ModuleOption {
  key: string;
  label: string;
  isCore: boolean;
  tier: number;
}

interface Props {
  modules: ModuleOption[];
}

export function StepModules({ modules }: Props) {
  const t = useT();

  const defaultSelected = modules.filter((m) => m.tier <= 2).map((m) => m.key);
  const [selected, setSelected] = useState<string[]>(defaultSelected);

  const [state, action, pending] = useActionState(saveOnboardingStep5, undefined);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Módulos configurados");
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  function toggle(mod: ModuleOption) {
    if (mod.tier === 1) return;
    setSelected((prev) =>
      prev.includes(mod.key) ? prev.filter((k) => k !== mod.key) : [...prev, mod.key]
    );
  }

  const byTier = new Map<number, ModuleOption[]>();
  for (const m of modules) {
    const arr = byTier.get(m.tier) ?? [];
    arr.push(m);
    byTier.set(m.tier, arr);
  }

  return (
    <form action={action}>
      <input type="hidden" name="enabledModules" value={JSON.stringify(selected)} />

      <p style={{ marginBottom: 16, color: "#666" }}>
        {t("onboarding.select_modules")}
      </p>

      {[1, 2, 3, 4].map((tier) => {
        const mods = byTier.get(tier);
        if (!mods?.length) return null;
        return (
          <div key={tier} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cc-text, #111)", marginBottom: 4 }}>
              {t(`onboarding.tier${tier}.title`)}
            </div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{t(`onboarding.tier${tier}.hint`)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {mods.map((mod) => {
                const isSelected = selected.includes(mod.key);
                const isLocked = mod.tier === 1;
                return (
                  <label
                    key={mod.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px 16px",
                      border: `1px solid ${isSelected ? "var(--cc-primary, #3b82f6)" : "var(--cc-border, #e0e0e0)"}`,
                      borderRadius: 8,
                      cursor: isLocked ? "default" : "pointer",
                      opacity: isLocked ? 0.75 : 1,
                      background: isSelected ? "var(--cc-primary-bg, #eff6ff)" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected || isLocked}
                      onChange={() => toggle(mod)}
                      disabled={isLocked}
                    />
                    <span style={{ fontWeight: 500 }}>{mod.label}</span>
                    {isLocked && <span style={{ fontSize: 11, color: "#999" }}>{t("onboarding.essential_badge")}</span>}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 16 }}>
        <button type="submit" disabled={pending} className="cc-btn cc-btn-primary">
          {pending ? "..." : t("common.save")}
        </button>
      </div>
    </form>
  );
}
