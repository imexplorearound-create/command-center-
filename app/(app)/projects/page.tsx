import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantDb } from "@/lib/tenant";
import { getAuthUser } from "@/lib/auth/dal";
import { NewProjectButton } from "@/components/projects/new-project-button";
import { NOT_ARCHIVED } from "@/lib/queries";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  health?: string;
  include_archived?: string;
  sort?: "name" | "updated";
}

const HEALTH_COLOR: Record<string, string> = {
  ok: "var(--success, #2D8A5E)",
  warn: "var(--warning, #D4883A)",
  block: "var(--error, #C0392B)",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [user, sp] = await Promise.all([getAuthUser(), searchParams]);
  if (!user) redirect("/login");

  const includeArchived = sp.include_archived === "1";
  const q = (sp.q ?? "").trim();
  const healthFilter = sp.health && ["ok", "warn", "block"].includes(sp.health) ? sp.health : null;
  const sort = sp.sort === "name" ? "name" : "updated";

  const db = await getTenantDb();
  const where: Prisma.ProjectWhereInput = {
    ...(includeArchived ? {} : NOT_ARCHIVED),
    ...(healthFilter ? { health: healthFilter } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const projects = await db.project.findMany({
    where,
    orderBy:
      sort === "name"
        ? { name: "asc" }
        : { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      health: true,
      status: true,
      progress: true,
      description: true,
      color: true,
      archivedAt: true,
      client: { select: { companyName: true } },
      updatedAt: true,
    },
  });

  const canCreate = user.role === "admin" || user.role === "manager";

  return (
    <div style={{ padding: 32, maxWidth: 1240, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Projectos</h1>
          <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 13 }}>
            {projects.length} resultado{projects.length === 1 ? "" : "s"}
            {!includeArchived ? " · só activos" : ""}
            {healthFilter ? ` · health ${healthFilter}` : ""}
          </p>
        </div>
        {canCreate ? <NewProjectButton /> : null}
      </header>

      <form
        method="get"
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          padding: "12px 16px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Procurar por nome ou descrição"
          style={{
            flex: 1,
            minWidth: 200,
            padding: "8px 12px",
            background: "var(--bg-subtle)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
            fontFamily: "inherit",
            fontSize: 13,
          }}
        />
        <select
          name="health"
          defaultValue={healthFilter ?? ""}
          style={{
            padding: "8px 12px",
            background: "var(--bg-subtle)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          <option value="">Todos os health</option>
          <option value="ok">OK</option>
          <option value="warn">Warn</option>
          <option value="block">Block</option>
        </select>
        <select
          name="sort"
          defaultValue={sort}
          style={{
            padding: "8px 12px",
            background: "var(--bg-subtle)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          <option value="updated">Actualizado</option>
          <option value="name">Nome</option>
        </select>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
          <input type="checkbox" name="include_archived" value="1" defaultChecked={includeArchived} />
          Incluir arquivados
        </label>
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Filtrar
        </button>
      </form>

      {projects.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          Sem projectos que correspondam aos filtros.
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {projects.map((p) => {
            const color = HEALTH_COLOR[p.health] ?? "var(--muted)";
            return (
              <li key={p.id}>
                <Link
                  href={`/project/${p.slug}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto auto",
                    gap: 16,
                    alignItems: "center",
                    padding: "14px 18px",
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderLeft: `4px solid ${color}`,
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: p.color ?? "var(--muted)",
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "var(--text)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {p.name}
                      {p.archivedAt ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            padding: "2px 7px",
                            borderRadius: 4,
                            background: "rgba(255,255,255,0.06)",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          arquivado
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      {p.client?.companyName ? `${p.client.companyName} · ` : ""}
                      {p.status}
                      {p.description ? ` · ${p.description.slice(0, 80)}${p.description.length > 80 ? "…" : ""}` : ""}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--muted)", minWidth: 60, textAlign: "right" }}>
                    {p.progress}%
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "3px 9px",
                      borderRadius: 4,
                      background: `color-mix(in oklch, ${color} 14%, transparent)`,
                      color,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {p.health}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
