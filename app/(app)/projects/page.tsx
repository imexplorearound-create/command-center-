import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantDb } from "@/lib/tenant";
import { getAuthUser } from "@/lib/auth/dal";
import { NewProjectButton } from "@/components/projects/new-project-button";
import { PageHeader } from "@/components/layout/page-header";
import { NOT_ARCHIVED } from "@/lib/queries";
import { HEALTH_COLOR } from "@/lib/dashboard-helpers";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  health?: string;
  include_archived?: string;
  sort?: "name" | "updated";
}

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
  const subtitleParts = [
    `${projects.length} resultado${projects.length === 1 ? "" : "s"}`,
    !includeArchived ? "só activos" : null,
    healthFilter ? `health ${healthFilter}` : null,
  ].filter(Boolean);

  const inputStyle = {
    padding: "8px 12px",
    background: "var(--bg-3)",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius-input)",
    color: "var(--ink)",
    fontFamily: "var(--font-sans)",
    fontSize: 13,
  };

  return (
    <PageHeader
      kicker="Projectos · Lista"
      title="Projectos"
      subtitle={subtitleParts.join(" · ")}
      actions={canCreate ? <NewProjectButton /> : undefined}
    >
      <form
        method="get"
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          padding: "12px 16px",
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-card)",
          marginBottom: 20,
        }}
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Procurar por nome ou descrição"
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <select name="health" defaultValue={healthFilter ?? ""} style={inputStyle}>
          <option value="">Todos os health</option>
          <option value="ok">OK</option>
          <option value="warn">Warn</option>
          <option value="block">Block</option>
        </select>
        <select name="sort" defaultValue={sort} style={inputStyle}>
          <option value="updated">Actualizado</option>
          <option value="name">Nome</option>
        </select>
        <label
          className="meta"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <input type="checkbox" name="include_archived" value="1" defaultChecked={includeArchived} />
          Incluir arquivados
        </label>
        <button type="submit" className="btn btn-primary">
          Filtrar
        </button>
      </form>

      {projects.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
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
                  className="card"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto auto",
                    gap: 16,
                    alignItems: "center",
                    padding: "14px 18px",
                    borderLeft: `3px solid ${color}`,
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
                        fontFamily: "var(--font-serif)",
                        fontSize: 16,
                        fontWeight: 600,
                        color: "var(--ink)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {p.name}
                      {p.archivedAt ? (
                        <span className="mono" style={{ color: "var(--muted)" }}>
                          arquivado
                        </span>
                      ) : null}
                    </div>
                    <div className="meta" style={{ marginTop: 3 }}>
                      {p.client?.companyName ? `${p.client.companyName} · ` : ""}
                      {p.status}
                      {p.description ? ` · ${p.description.slice(0, 80)}${p.description.length > 80 ? "…" : ""}` : ""}
                    </div>
                  </div>
                  <span className="meta" style={{ minWidth: 60, textAlign: "right" }}>
                    {p.progress}%
                  </span>
                  <span
                    className="pill"
                    style={{
                      background: `color-mix(in oklch, ${color} 14%, transparent)`,
                      color,
                      borderColor: `color-mix(in oklch, ${color} 30%, transparent)`,
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
    </PageHeader>
  );
}
