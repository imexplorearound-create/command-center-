"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { triggerMyBriefing } from "@/lib/actions/briefing-actions";

export function TriggerBriefingButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await triggerMyBriefing();
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      const status = res.data?.status;
      if (status === "delivered") toast.success("Briefing gerado e entregue");
      else if (status === "skipped_empty") toast.info("Sem dados para hoje — briefing não gerado");
      else if (status === "failed") toast.error(`Falhou: ${res.data?.error ?? "erro desconhecido"}`);
      else toast(`Estado: ${status}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="cc-btn cc-btn-primary"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "A gerar…" : "Gerar agora"}
    </button>
  );
}
