/**
 * Wrapper de campo de formulário com label.
 * Usado pelos modais de CRUD (project, task, person, area).
 */
export function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "0.78rem", color: "var(--muted, #999)" }}>{label}</span>
      {children}
    </label>
  );
}
