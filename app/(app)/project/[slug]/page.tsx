import { notFound } from "next/navigation";
import { getProjectBySlug, getKanbanOptions } from "@/lib/queries";
import { getAuthUser } from "@/lib/auth/dal";
import { ProjectView } from "./project-view";
import type { TaskData } from "@/lib/types";

type TabKey = "kanban" | "timeline" | "dev";

const VALID_TABS: TabKey[] = ["kanban", "timeline", "dev"];

interface SearchParams {
  tab?: string;
  assignee?: string;
  priority?: string;
  origin?: string;
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);

  const [project, user, options] = await Promise.all([
    getProjectBySlug(slug),
    getAuthUser(),
    getKanbanOptions(),
  ]);
  if (!project) notFound();

  const tab: TabKey = VALID_TABS.includes(sp.tab as TabKey) ? (sp.tab as TabKey) : "kanban";
  const filters = {
    assignee: sp.assignee || undefined,
    priority: sp.priority || undefined,
    origin: sp.origin || undefined,
  };

  const filteredTasks: TaskData[] = project.tasks.filter((t) => {
    if (filters.assignee && t.assigneeId !== filters.assignee) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.origin && t.origin !== filters.origin) return false;
    return true;
  });

  const origins = Array.from(
    new Set(project.tasks.map((t) => t.origin).filter((o): o is string => !!o))
  ).sort();

  const canEdit = user?.role === "admin";
  const canWrite = user?.role === "admin" || user?.role === "membro";

  return (
    <ProjectView
      project={{ ...project, tasks: filteredTasks }}
      slug={slug}
      canEdit={canEdit}
      canWrite={canWrite}
      initialTab={tab}
      people={options.people}
      areas={options.areas}
      filters={filters}
      origins={origins}
    />
  );
}
