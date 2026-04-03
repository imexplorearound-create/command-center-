import { type LucideIcon } from "lucide-react";
import type { SatelliteData } from "@/lib/types";

interface SatelliteCardProps extends SatelliteData {
  icon: LucideIcon;
  color: string;
}

export function SatelliteCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: SatelliteCardProps) {
  return (
    <div className="cc-card cc-satellite">
      <div
        className="cc-satellite-icon"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div className="cc-satellite-value">{value}</div>
        <div className="cc-satellite-label">{label}</div>
        {sub && <div className="cc-satellite-sub">{sub}</div>}
      </div>
    </div>
  );
}
