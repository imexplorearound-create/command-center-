"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  value: string;
  toastLabel?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export function CopyButton({
  value,
  toastLabel,
  children,
  className = "cc-btn cc-btn-secondary",
  style,
  disabled,
}: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleClick() {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        toast.success(toastLabel ? `${toastLabel} copiado` : "Copiado");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Falhou — copia manualmente"));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={className}
      style={style}
    >
      {copied ? <>✓ {children ?? "Copiado"}</> : children ?? "Copiar"}
    </button>
  );
}
