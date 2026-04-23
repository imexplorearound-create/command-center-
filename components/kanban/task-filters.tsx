import type { PersonOption } from "@/lib/types";
import { TASK_PRIORITY_OPTIONS } from "@/lib/validation/task-schema";
import { formInputStyle } from "@/components/shared/form-styles";

interface Props {
  basePath: string;
  currentTab: "kanban" | "timeline" | "dev";
  people: PersonOption[];
  selected: {
    assignee?: string;
    priority?: string;
    origin?: string;
  };
  origins: string[];
}

export function TaskFilters({ basePath, currentTab, people, selected, origins }: Props) {
  const hasFilter = !!(selected.assignee || selected.priority || selected.origin);

  return (
    <form
      action={basePath}
      method="GET"
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        marginBottom: 12,
        flexWrap: "wrap",
      }}
    >
      <input type="hidden" name="tab" value={currentTab} />

      <select name="assignee" defaultValue={selected.assignee ?? ""} style={formInputStyle}>
        <option value="">Todos os responsáveis</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <select name="priority" defaultValue={selected.priority ?? ""} style={formInputStyle}>
        <option value="">Qualquer prioridade</option>
        {TASK_PRIORITY_OPTIONS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      {origins.length > 0 && (
        <select name="origin" defaultValue={selected.origin ?? ""} style={formInputStyle}>
          <option value="">Qualquer origem</option>
          {origins.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}

      <button type="submit" style={btnStyle}>
        Filtrar
      </button>
      {hasFilter && (
        <a href={`${basePath}?tab=${currentTab}`} style={{ ...btnStyle, textDecoration: "none", display: "inline-block" }}>
          Limpar
        </a>
      )}
    </form>
  );
}

const btnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "var(--text, #fff)",
  padding: "6px 12px",
  borderRadius: 6,
  fontSize: "0.8rem",
  cursor: "pointer",
};
