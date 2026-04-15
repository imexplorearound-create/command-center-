"use client";

import { CopyButton } from "@/components/shared/copy-button";
import { useT } from "@/lib/i18n/context";

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  project: Project;
  serverUrl: string;
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          readOnly
          value={value}
          style={{
            flex: 1,
            padding: "8px 10px",
            fontFamily: "monospace",
            fontSize: 12,
            border: "1px solid var(--cc-border, #e0e0e0)",
            borderRadius: 6,
            background: "var(--cc-code-bg, #f4f4f5)",
          }}
        />
        <CopyButton value={value} toastLabel={label} style={{ minWidth: 90 }} />
      </div>
    </div>
  );
}

export function TesterSetupView({ project, serverUrl }: Props) {
  const t = useT();
  return (
    <>
      <div className="cc-page-header">
        <div className="cc-page-title">🎤 {t("tester_setup.title")}</div>
        <div className="cc-page-subtitle" dangerouslySetInnerHTML={{
          __html: t("tester_setup.subtitle", { project: `<strong>${project.name}</strong>` }),
        }} />
      </div>

      <div className="cc-card" style={{ padding: 20, maxWidth: 720 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t("tester_setup.step1_title")}</div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
          {t("tester_setup.step1_intro")}
        </p>

        <CopyField label={t("tester_setup.server_url")} value={serverUrl} />
        <CopyField label={t("tester_setup.project_slug")} value={project.slug} />

        <div style={{ borderTop: "1px solid var(--cc-border, #e0e0e0)", margin: "20px 0 16px" }} />

        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t("tester_setup.step2_title")}</div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
          {t("tester_setup.step2_intro")}
        </p>
        <pre
          style={{
            padding: 12,
            fontSize: 11,
            fontFamily: "monospace",
            background: "var(--cc-code-bg, #f4f4f5)",
            border: "1px solid var(--cc-border, #e0e0e0)",
            borderRadius: 6,
            overflow: "auto",
          }}
        >
          pnpm tsx scripts/create-tester.ts email@cliente.pt &quot;Nome do Tester&quot; --password=&lt;pwd&gt; --project={project.slug}
        </pre>

        <div style={{ borderTop: "1px solid var(--cc-border, #e0e0e0)", margin: "20px 0 16px" }} />

        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t("tester_setup.step3_title")}</div>
        <ol style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 20, color: "var(--cc-text, #111)" }}>
          <li dangerouslySetInnerHTML={{ __html: t("tester_setup.step3_item1") }} />
          <li dangerouslySetInnerHTML={{ __html: t("tester_setup.step3_item2") }} />
          <li dangerouslySetInnerHTML={{ __html: t("tester_setup.step3_item3") }} />
          <li dangerouslySetInnerHTML={{ __html: t("tester_setup.step3_item4") }} />
          <li dangerouslySetInnerHTML={{ __html: t("tester_setup.step3_item5") }} />
          <li dangerouslySetInnerHTML={{ __html: t("tester_setup.step3_item6") }} />
        </ol>

        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 16 }}
          dangerouslySetInnerHTML={{ __html: t("tester_setup.tip") }}
        />
      </div>
    </>
  );
}
