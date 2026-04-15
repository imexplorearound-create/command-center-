"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { convertToProject } from "@/lib/actions/opportunity-actions";
import {
  formButtonStyle,
  formButtonPrimaryStyle,
} from "@/components/shared/form-styles";

interface Props {
  opportunityId: string;
}

export function ConvertToProjectButton({ opportunityId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleConvert() {
    setLoading(true);
    const r = await convertToProject(opportunityId);
    setLoading(false);
    if ("error" in r) {
      toast.error(r.error);
    } else if (r.success && r.data) {
      toast.success("Convertido em projecto");
      router.push(`/project/${r.data.projectId}`);
    }
  }

  return (
    <button
      type="button"
      onClick={handleConvert}
      disabled={loading}
      style={{
        ...formButtonStyle,
        ...formButtonPrimaryStyle,
        background: "var(--green, #22c55e)",
        borderColor: "var(--green, #22c55e)",
        opacity: loading ? 0.6 : 1,
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "A converter..." : "Converter em Projecto"}
    </button>
  );
}
