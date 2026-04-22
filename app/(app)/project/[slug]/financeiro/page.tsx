import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjectBySlug, getAreas } from "@/lib/queries";
import { getInvestmentMapByProject } from "@/lib/queries/investment-queries";
import { InvestmentMapView } from "@/components/investment/investment-map-view";
import { CreateMapForm } from "@/components/investment/create-map-form";
import { getAuthUser } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProjectFinanceiroPage({ params }: Props) {
  const { slug } = await params;
  const [project, user] = await Promise.all([getProjectBySlug(slug), getAuthUser()]);
  if (!project) notFound();

  const [map, areas] = await Promise.all([
    getInvestmentMapByProject(project.id),
    getAreas(),
  ]);

  const areaOptions = areas.map((a) => ({ id: a.id, name: a.name }));
  const canEdit = user?.role === "admin";

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Link
          href={`/project/${slug}`}
          style={{ color: "var(--muted)", fontSize: "0.82rem", textDecoration: "none" }}
        >
          &larr; {project.name}
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 24px" }}>
        Financeiro
      </h1>

      {map ? (
        <InvestmentMapView map={map} areas={areaOptions} canEdit={canEdit} />
      ) : (
        <div className="cc-card" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ color: "var(--muted)", marginBottom: 16 }}>
            Este projecto ainda não tem mapa de investimento.
          </p>
          {canEdit ? <CreateMapForm projectId={project.id} /> : null}
        </div>
      )}
    </div>
  );
}
