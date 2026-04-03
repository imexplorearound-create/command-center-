import { AlertTriangle, Clock } from "lucide-react";
import type { AlertData, AlertType, Severity } from "@/lib/types";

const alertIcons: Partial<Record<AlertType, React.ReactNode>> = {
  tarefa_atrasada: <Clock size={14} />,
};

const severityClass: Record<Severity, string> = {
  critical: "cc-alert-critical",
  warning: "cc-alert-warning",
  info: "cc-alert-info",
};

export function AlertsPanel({ alerts }: { alerts: AlertData[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="cc-card">
      <div className="cc-section-title">⚠️ Atenção</div>
      {alerts.map((alert) => (
        <div key={alert.id} className={`cc-alert ${severityClass[alert.severity] ?? "cc-alert-info"}`}>
          <span className="cc-alert-icon">
            {alertIcons[alert.type] ?? <AlertTriangle size={14} />}
          </span>
          <div>
            <div className="cc-alert-title">{alert.title}</div>
            {alert.description && (
              <div className="cc-alert-desc">{alert.description}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
