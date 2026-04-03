"use client";

import { useActionState } from "react";
import { login } from "@/lib/auth/actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
    }}>
      <div style={{
        width: 380,
        padding: 40,
        borderRadius: 16,
        background: "var(--card)",
        border: "1px solid var(--border)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text)" }}>
            Command Center
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 4 }}>
            Iniciar sessão
          </div>
        </div>

        <form action={formAction}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="email" style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: 6 }}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label htmlFor="password" style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: 6 }}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {state?.error && (
            <div style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "var(--red-glow, rgba(239,68,68,0.12))",
              color: "var(--red, #ef4444)",
              fontSize: "0.82rem",
              marginBottom: 16,
            }}>
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "var(--accent, #3b82f6)",
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: pending ? "wait" : "pointer",
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? "A entrar..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
