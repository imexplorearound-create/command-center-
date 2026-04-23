"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDateShort } from "@/lib/utils";
import type { ContentItemData } from "@/lib/types";

interface Props {
  item: ContentItemData;
  onEdit: (item: ContentItemData) => void;
  ghost?: boolean;
}

function platformClass(platform?: string): string {
  switch (platform?.toLowerCase()) {
    case "linkedin": return "cc-content-platform cc-content-platform-linkedin";
    case "instagram": return "cc-content-platform cc-content-platform-instagram";
    case "tiktok": return "cc-content-platform cc-content-platform-tiktok";
    default: return "cc-content-platform";
  }
}

export function ContentCard({ item, onEdit, ghost = false }: Props) {
  const sortable = useSortable({ id: item.id, disabled: ghost });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: "grab",
  };

  function handleClick() {
    if (isDragging) return;
    onEdit(item);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cc-content-card"
      onClick={handleClick}
      {...(!ghost ? attributes : {})}
      {...(!ghost ? listeners : {})}
    >
      <div className="cc-content-card-title">{item.title}</div>
      <div className="cc-content-card-meta">
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {item.format && <span className="cc-content-format">{item.format}</span>}
          {item.platform && <span className={platformClass(item.platform)}>{item.platform}</span>}
        </div>
        {item.sourceCallDate && <span>Call: {formatDateShort(item.sourceCallDate)}</span>}
        {item.publishedAt && <span>Pub: {formatDateShort(item.publishedAt)}</span>}
      </div>
    </div>
  );
}
