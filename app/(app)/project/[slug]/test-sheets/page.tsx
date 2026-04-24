import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { getAuthUser } from "@/lib/auth/dal";
import { getTenantDb } from "@/lib/tenant";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function ProjectTestSheetsPage({ params }: Params) {
  const { slug } = await params;

  const [user, db] = await Promise.all([getAuthUser(), getTenantDb()]);
  if (!user) redirect("/login");

  const project = await db.project.findFirst({
    where: { slug, archivedAt: null },
    select: { id: true, name: true, slug: true },
  });
  if (!project) notFound();

  if (user.role === "cliente" && !user.projectIds.includes(project.id)) {
    redirect("/");
  }

  const sheets = await db.testSheet.findMany({
    where: { projectId: project.id, archivedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      cases: {
        where: { archivedAt: null },
        orderBy: { code: "asc" },
        take: 500,
      },
    },
  });

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <Link
        href={`/project/${project.slug}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 13,
          color: "#666",
          textDecoration: "none",
          marginBottom: 16,
        }}
      >
        <ChevronLeft size={14} /> {project.name}
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
        <FileText size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />
        Folhas de testes
      </h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>
        Criadas pelo developer via API. Usa o código do teste (ex. <code>T-001</code>)
        quando fizeres feedback para ligar a nota ao caso correcto.
      </p>

      {sheets.length === 0 ? (
        <p style={{ color: "#888", fontSize: 14 }}>
          Ainda não há folhas de testes para este projecto.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sheets.map((sheet) => (
            <section
              key={sheet.id}
              className="cc-card"
              style={{ padding: 20 }}
            >
              <header style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                  {sheet.title}
                </h2>
                {sheet.description && (
                  <p style={{ fontSize: 13, color: "#666", margin: "4px 0 0" }}>
                    {sheet.description}
                  </p>
                )}
              </header>

              {sheet.cases.length === 0 ? (
                <p style={{ fontSize: 13, color: "#888" }}>Sem casos nesta folha.</p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {sheet.cases.map((c) => (
                    <li
                      key={c.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 1fr",
                        gap: 12,
                        padding: "8px 0",
                        borderTop: "1px solid #f0f0f0",
                        alignItems: "start",
                      }}
                    >
                      <code
                        style={{
                          fontSize: 12,
                          fontFamily: "monospace",
                          padding: "2px 6px",
                          background: "#f5f5f5",
                          borderRadius: 4,
                          justifySelf: "start",
                        }}
                      >
                        {c.code}
                      </code>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{c.title}</div>
                        {c.module && (
                          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                            módulo: {c.module}
                          </div>
                        )}
                        {c.description && (
                          <p style={{ fontSize: 13, color: "#555", margin: "4px 0 0" }}>
                            {c.description}
                          </p>
                        )}
                        {c.expectedResult && (
                          <p style={{ fontSize: 13, color: "#666", margin: "4px 0 0" }}>
                            <em>Esperado:</em> {c.expectedResult}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
