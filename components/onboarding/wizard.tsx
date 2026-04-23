"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/context";
import { StepCompany } from "./step-company";
import { StepTeam } from "./step-team";
import { StepAreas } from "./step-areas";
import { StepPeople } from "./step-people";
import { StepModules } from "./step-modules";
import { StepIntegrations } from "./step-integrations";
import { completeOnboarding } from "@/lib/actions/onboarding-actions";
import { toast } from "sonner";

interface WizardProps {
  tenantName: string;
  modules: { key: string; label: string; isCore: boolean; tier: number }[];
}

const STEPS = [
  "step1_company",
  "step2_team",
  "step3_areas",
  "step4_people",
  "step5_modules",
  "step6_integrations",
] as const;

export function OnboardingWizard({ tenantName, modules }: WizardProps) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  function handleNext() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function handlePrev() {
    if (step > 0) setStep(step - 1);
  }

  async function handleFinish() {
    setCompleting(true);
    const result = await completeOnboarding();
    if ("error" in result) {
      toast.error(result.error);
      setCompleting(false);
    } else {
      toast.success("Onboarding concluído!");
      window.location.href = "/";
    }
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>{t("onboarding.welcome")}</h1>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= step ? "var(--cc-primary, #3b82f6)" : "var(--cc-border, #e0e0e0)",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>

      <p style={{ color: "#666", marginBottom: 24 }}>
        {t(`onboarding.${STEPS[step]}`)} ({step + 1}/{STEPS.length})
      </p>

      {/* Step content */}
      <div style={{ minHeight: 300 }}>
        {step === 0 && <StepCompany tenantName={tenantName} onSuccess={handleNext} />}
        {step === 1 && <StepTeam onSuccess={handleNext} />}
        {step === 2 && <StepAreas onSuccess={handleNext} />}
        {step === 3 && <StepPeople onSuccess={handleNext} />}
        {step === 4 && <StepModules modules={modules} />}
        {step === 5 && <StepIntegrations onSuccess={handleNext} />}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 16, borderTop: "1px solid var(--cc-border, #e0e0e0)" }}>
        <button
          onClick={handlePrev}
          disabled={step === 0}
          className="cc-btn cc-btn-secondary"
          style={{ opacity: step === 0 ? 0.5 : 1 }}
        >
          {t("onboarding.previous")}
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          {!isLast && (
            <button onClick={handleNext} className="cc-btn cc-btn-secondary">
              {t("onboarding.skip")}
            </button>
          )}
          {isLast ? (
            <button
              onClick={handleFinish}
              disabled={completing}
              className="cc-btn cc-btn-primary"
            >
              {completing ? "..." : t("onboarding.finish")}
            </button>
          ) : (
            <button onClick={handleNext} className="cc-btn cc-btn-primary">
              {t("onboarding.next")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
