import type { CSSProperties } from "react";

/**
 * Estilos partilhados pelos formulários CRUD.
 * Quando houver `.cc-form-*` em globals.css, migrar para classes.
 */

export const formLabelStyle: CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "var(--muted, #999)",
  marginBottom: 6,
};

export const formInputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "var(--bg-subtle, rgba(255,255,255,0.04))",
  border: "1px solid var(--border, rgba(255,255,255,0.1))",
  borderRadius: 6,
  color: "var(--text, #fff)",
  fontSize: "0.88rem",
  fontFamily: "inherit",
  colorScheme: "dark",
};

export const formRowStyle: CSSProperties = { marginBottom: 14 };

export const formTwoColStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

// ─── Botões partilhados pelos modais ───────────────────────

export const formButtonStyle: CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "var(--text, #fff)",
  padding: "7px 14px",
  borderRadius: 6,
  fontSize: "0.85rem",
  cursor: "pointer",
};

export const formButtonPrimaryStyle: CSSProperties = {
  background: "var(--accent, #378ADD)",
  borderColor: "var(--accent, #378ADD)",
  color: "white",
  fontWeight: 600,
};

export const formButtonDangerStyle: CSSProperties = {
  color: "var(--red, #dc2626)",
  border: "1px solid var(--red, #dc2626)",
};
