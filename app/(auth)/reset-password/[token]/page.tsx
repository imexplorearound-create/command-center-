"use client";

import { useActionState, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/actions/invite-actions";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const [state, action, pending] = useActionState(resetPassword, undefined);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      setDone(true);
      toast.success("Password alterada com sucesso!");
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  if (done) {
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Password Alterada</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>Podes agora fazer login com a nova password.</p>
        <Link href="/login" className="cc-btn cc-btn-primary">Ir para Login</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Nova Password</h1>

      <form action={action}>
        <input type="hidden" name="token" value={params.token} />

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Nova Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="cc-input"
            style={{ width: "100%" }}
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <button type="submit" disabled={pending} className="cc-btn cc-btn-primary" style={{ width: "100%" }}>
          {pending ? "..." : "Guardar Password"}
        </button>
      </form>
    </div>
  );
}
