import { getObjectives } from "@/lib/queries";
import { getAuthUser } from "@/lib/auth/dal";
import { ObjectivesMap } from "./objectives-map";

export default async function ObjectivesPage() {
  const user = await getAuthUser();
  const objectives = await getObjectives(user);

  return (
    <>
      <div className="cc-page-header">
        <div className="cc-page-title">Mapa Estratégico</div>
        <div className="cc-page-subtitle">Objectivos 2026 — como tudo se liga</div>
      </div>

      <ObjectivesMap objectives={objectives} />
    </>
  );
}
