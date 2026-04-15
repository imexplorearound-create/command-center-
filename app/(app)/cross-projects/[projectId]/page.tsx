import { getInvestmentMapByProject } from "@/lib/queries/investment-queries";
import { getAreas } from "@/lib/queries";
import { InvestmentMapView } from "@/components/investment/investment-map-view";
import { CreateMapForm } from "./create-map-form";
import Link from "next/link";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectInvestmentPage({ params }: Props) {
  const { projectId } = await params;
  const [map, areas] = await Promise.all([
    getInvestmentMapByProject(projectId),
    getAreas(),
  ]);

  const areaOptions = areas.map((a) => ({ id: a.id, name: a.name }));

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/cross-projects"
          style={{ color: "var(--muted)", fontSize: "0.82rem", textDecoration: "none" }}
        >
          &larr; Voltar
        </Link>
      </div>

      {map ? (
        <InvestmentMapView map={map} areas={areaOptions} canEdit />
      ) : (
        <div className="cc-card" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ color: "var(--muted)", marginBottom: 16 }}>
            Este projecto ainda não tem mapa de investimento.
          </p>
          <CreateMapForm projectId={projectId} />
        </div>
      )}
    </>
  );
}
