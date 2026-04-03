import { getContentItems } from "@/lib/queries";
import { formatDateShort } from "@/lib/utils";
import type { ContentStatus, ContentItemData } from "@/lib/types";

const COLUMNS: { key: ContentStatus; label: string; icon: string }[] = [
  { key: "proposta", label: "Proposta", icon: "💡" },
  { key: "aprovado", label: "Aprovado", icon: "👍" },
  { key: "em_producao", label: "Produção", icon: "🎬" },
  { key: "pronto", label: "Pronto", icon: "✅" },
  { key: "publicado", label: "Publicado", icon: "📢" },
];

function platformClass(platform?: string): string {
  switch (platform?.toLowerCase()) {
    case "linkedin": return "cc-content-platform cc-content-platform-linkedin";
    case "instagram": return "cc-content-platform cc-content-platform-instagram";
    case "tiktok": return "cc-content-platform cc-content-platform-tiktok";
    default: return "cc-content-platform";
  }
}

export default async function ContentPage() {
  const contentItems = await getContentItems();

  const grouped = new Map<ContentStatus, ContentItemData[]>();
  for (const item of contentItems) {
    const arr = grouped.get(item.status) ?? [];
    arr.push(item);
    grouped.set(item.status, arr);
  }

  return (
    <>
      <div className="cc-page-header">
        <div className="cc-page-title">🎬 Pipeline de Conteúdo</div>
        <div className="cc-page-subtitle">Propostas → Publicação</div>
      </div>

      <div className="cc-content-pipeline">
        {COLUMNS.map(col => {
          const items = grouped.get(col.key) ?? [];
          return (
            <div key={col.key} className="cc-content-col">
              <div className="cc-content-col-header">
                {col.icon} {col.label}
                <span className="cc-content-col-count">{items.length}</span>
              </div>
              {items.map(item => (
                <div key={item.id} className="cc-content-card">
                  <div className="cc-content-card-title">{item.title}</div>
                  <div className="cc-content-card-meta">
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <span className="cc-content-format">{item.format}</span>
                      {item.platform && <span className={platformClass(item.platform)}>{item.platform}</span>}
                    </div>
                    {item.sourceCallDate && <span>Call: {formatDateShort(item.sourceCallDate)}</span>}
                    {item.publishedAt && <span>Publicado: {formatDateShort(item.publishedAt)}</span>}
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div style={{ textAlign: "center", padding: 20, fontSize: "0.78rem", color: "var(--muted)" }}>
                  Vazio
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
