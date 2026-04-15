"use client";

import { useActionState, useEffect } from "react";
import { useParams } from "next/navigation";
import { acceptInvite } from "@/lib/actions/invite-actions";
import { toast } from "sonner";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const [state, action, pending] = useActionState(acceptInvite, undefined);

  useEffect(() => {
    if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Activar Conta</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>Define a tua password para aceder ao Command Center.</p>

      <form action={action}>
        <input type="hidden" name="token" value={params.token} />

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Password</label>
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
          {pending ? "..." : "Activar Conta"}
        </button>
      </form>
    </div>
  );
}
