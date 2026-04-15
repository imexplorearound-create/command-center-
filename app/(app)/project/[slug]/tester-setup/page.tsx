import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/dal";
import { getTenantDb } from "@/lib/tenant";
import { TesterSetupView } from "./tester-setup-view";

export default async function TesterSetupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdminPage();
  const { slug } = await params;

  const db = await getTenantDb();
  const project = await db.project.findFirst({
    where: { slug, archivedAt: null },
    select: { id: true, name: true, slug: true },
  });
  if (!project) notFound();

  const serverUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3100";

  return <TesterSetupView project={project} serverUrl={serverUrl} />;
}
