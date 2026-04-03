import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/queries";
import { ProjectView } from "./project-view";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return <ProjectView project={project} slug={slug} />;
}
