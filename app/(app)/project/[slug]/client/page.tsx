import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/queries";
import { ClientView } from "./client-view";

export default async function ClientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project || !project.client) notFound();

  return (
    <ClientView
      slug={slug}
      projectName={project.name}
      client={project.client}
    />
  );
}
