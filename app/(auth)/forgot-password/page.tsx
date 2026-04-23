"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/invite-actions";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      setSent(true);
      toast.success("Se o email existir, receberás instruções para redefinir a password.");
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  if (sent) {
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Email Enviado</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>
          Se o email estiver registado, receberás um link para redefinir a password. Verifica o spam.
        </p>
        <Link href="/login" className="cc-btn cc-btn-secondary">Voltar ao Login</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Esqueci a Password</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>Introduz o teu email para receber um link de reset.</p>

      <form action={action}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Email</label>
          <input
            name="email"
            type="email"
            required
            className="cc-input"
            style={{ width: "100%" }}
          />
        </div>

        <button type="submit" disabled={pending} className="cc-btn cc-btn-primary" style={{ width: "100%" }}>
          {pending ? "..." : "Enviar Link"}
        </button>
      </form>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <Link href="/login" style={{ color: "#666", fontSize: 13 }}>Voltar ao Login</Link>
      </div>
    </div>
  );
}
