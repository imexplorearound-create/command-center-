import { formatDate } from "@/lib/utils";

export function Topbar() {
  return (
    <div className="cc-topbar">
      {formatDate(new Date())}
    </div>
  );
}
