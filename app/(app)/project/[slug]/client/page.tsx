import { notFound } from "next/navigation";
import { getProjectBySlug, getKanbanOptions } from "@/lib/queries";
import { ClientView } from "./client-view";

export default async function ClientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, { people }] = await Promise.all([
    getProjectBySlug(slug),
    getKanbanOptions(),
  ]);
  if (!project || !project.client) notFound();

  return (
    <ClientView
      slug={slug}
      projectId={project.id}
      projectName={project.name}
      client={project.client}
      people={people}
    />
  );
}
