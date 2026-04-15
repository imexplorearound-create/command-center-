import { getAuthUser, isWriter } from "@/lib/auth/dal";
import { MaestroProvider } from "./maestro-context";
import { MaestroPanel } from "./maestro-panel";

/**
 * Server component que decide se o painel do Maestro deve montar.
 * Apenas admin ou membro vêem o botão e o painel.
 */
export async function MaestroMount() {
  const user = await getAuthUser();
  if (!isWriter(user)) return null;

  return (
    <MaestroProvider>
      <MaestroPanel />
    </MaestroProvider>
  );
}
