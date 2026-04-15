"use client";

import { CopyButton } from "@/components/shared/copy-button";

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
  return (
    <>
      <div className="cc-page-header">
        <div className="cc-page-title">🎤 Partilhar com tester</div>
        <div className="cc-page-subtitle">
          Gera instruções para um tester testar <strong>{project.name}</strong> com a extensão Chrome.
        </div>
      </div>

      <div className="cc-card" style={{ padding: 20, maxWidth: 720 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>1. Dados do workspace</div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
          O tester precisa destes 2 valores para configurar o popup da extensão.
        </p>

        <CopyField label="Server URL" value={serverUrl} />
        <CopyField label="Slug do projecto" value={project.slug} />

        <div style={{ borderTop: "1px solid var(--cc-border, #e0e0e0)", margin: "20px 0 16px" }} />

        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>2. Criar o utilizador tester</div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
          Corre este comando no servidor para criar a conta:
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

        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>3. Instruções para o tester</div>
        <ol style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 20, color: "var(--cc-text, #111)" }}>
          <li>Instalar a extensão Chrome <code>Command Center Feedback</code>.</li>
          <li>Abrir o popup → aceitar o aviso de privacidade.</li>
          <li>Colar <strong>Server URL</strong> (campo no topo).</li>
          <li>Fazer login com email e password da conta criada em 2.</li>
          <li>Adicionar workspace: URL do site a testar + <strong>slug do projecto</strong>.</li>
          <li>No site autorizado, clicar no botão 🎤 flutuante para gravar feedback.</li>
        </ol>

        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 16 }}>
          💡 Os feedbacks aparecem em <code>/feedback</code> do lado do admin assim que são transcritos.
        </p>
      </div>
    </>
  );
}
