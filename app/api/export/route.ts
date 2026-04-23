import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTenantDb } from "@/lib/tenant";
import { getAuthUser } from "@/lib/auth/dal";
import {
  generateProjectsExcel,
  generateTimesheetsExcel,
  generatePipelineExcel,
  generatePeopleExcel,
  generateInvestmentsExcel,
} from "@/lib/export/excel";
import {
  generateProjectReport,
  generateTimesheetReport,
  generatePipelineReport,
} from "@/lib/export/pdf";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const format = searchParams.get("format");
  const projectId = searchParams.get("projectId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (!type || !format) {
    return NextResponse.json({ error: "type and format required" }, { status: 400 });
  }

  if (!["pdf", "excel"].includes(format)) {
    return NextResponse.json({ error: "format must be pdf or excel" }, { status: 400 });
  }

  const db = await getTenantDb();

  try {
    let buffer: Buffer;
    let filename: string;

    switch (type) {
      case "projects": {
        if (format === "pdf") {
          // PDF: load single project directly
          const target = await db.project.findFirst({
            where: { archivedAt: null, ...(projectId ? { id: projectId } : {}) },
            include: {
              phases: { select: { name: true, status: true, progress: true }, orderBy: { phaseOrder: "asc" } },
              tasks: { select: { status: true }, where: { archivedAt: null } },
            },
          });
          if (!target) {
            return NextResponse.json({ error: "Sem projectos" }, { status: 404 });
          }
          buffer = await generateProjectReport({
            name: target.name,
            status: target.status,
            health: target.health,
            progress: target.progress,
            type: target.type,
            description: target.description,
            phases: target.phases,
            taskStats: {
              total: target.tasks.length,
              done: target.tasks.filter((t: { status: string }) => t.status === "feito").length,
              inProgress: target.tasks.filter((t: { status: string }) => t.status === "em_curso").length,
            },
          });
          filename = `projecto-${target.name.toLowerCase().replace(/\s+/g, "-")}.pdf`;
        } else {
          // Excel: load all projects (no tasks needed)
          const projects = await db.project.findMany({
            where: { archivedAt: null },
            include: {
              phases: { select: { name: true, status: true, progress: true }, orderBy: { phaseOrder: "asc" } },
            },
            take: 200,
          });
          buffer = generateProjectsExcel(
            projects.map((p) => ({
              name: p.name,
              status: p.status,
              health: p.health,
              progress: p.progress,
              type: p.type,
              phases: p.phases,
            }))
          );
          filename = "projectos.xlsx";
        }
        break;
      }

      case "timesheets": {
        const dateFilter: Record<string, unknown> = {};
        if (dateFrom) dateFilter.gte = new Date(dateFrom);
        if (dateTo) dateFilter.lte = new Date(dateTo);

        const entries = await db.timeEntry.findMany({
          where: {
            archivedAt: null,
            ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
          },
          include: {
            person: { select: { name: true } },
            project: { select: { name: true } },
            task: { select: { title: true } },
          },
          orderBy: [{ date: "desc" }, { person: { name: "asc" } }],
          take: 2000,
        });

        const mapped = entries.map((e) => ({
          personName: e.person.name,
          projectName: e.project?.name ?? null,
          taskTitle: e.task?.title ?? null,
          date: e.date.toISOString().split("T")[0],
          duration: e.duration,
          isBillable: e.isBillable,
          status: e.status,
          description: e.description,
        }));

        if (format === "excel") {
          buffer = generateTimesheetsExcel(mapped);
          filename = "horas.xlsx";
        } else {
          buffer = await generateTimesheetReport(mapped, "Relatório de Horas");
          filename = "horas.pdf";
        }
        break;
      }

      case "pipeline": {
        const opportunities = await db.opportunity.findMany({
          where: { archivedAt: null },
          include: {
            contact: { select: { name: true } },
            owner: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        });

        const mapped = opportunities.map((o) => ({
          title: o.title,
          stage: o.stageId,
          value: o.value ? Number(o.value) : null,
          probability: o.probability,
          company: o.companyName,
          contact: o.contact?.name ?? null,
          owner: o.owner?.name ?? null,
          expectedClose: o.expectedClose?.toISOString().split("T")[0] ?? null,
          source: o.source,
        }));

        if (format === "excel") {
          buffer = generatePipelineExcel(mapped);
          filename = "pipeline.xlsx";
        } else {
          buffer = await generatePipelineReport(mapped);
          filename = "pipeline.pdf";
        }
        break;
      }

      case "people": {
        const people = await db.person.findMany({
          where: { archivedAt: null },
          select: { name: true, email: true, role: true, type: true },
          orderBy: { name: "asc" },
          take: 2000,
        });

        if (format === "excel") {
          buffer = generatePeopleExcel(people);
          filename = "pessoas.xlsx";
        } else {
          return NextResponse.json({ error: "PDF de pessoas não disponível — use Excel" }, { status: 400 });
        }
        break;
      }

      case "investments": {
        const maps = await db.investmentMap.findMany({
          where: { archivedAt: null },
          include: {
            project: { select: { name: true } },
            rubrics: {
              where: { archivedAt: null },
              include: { area: { select: { name: true } } },
              orderBy: { sortOrder: "asc" },
            },
          },
          take: 200,
        });

        if (format === "excel") {
          buffer = generateInvestmentsExcel(
            maps.map((m) => ({
              projectName: m.project.name,
              totalBudget: Number(m.totalBudget),
              fundingSource: m.fundingSource,
              fundingPercentage: m.fundingPercentage ? Number(m.fundingPercentage) : null,
              rubrics: m.rubrics.map((r) => ({
                name: r.name,
                allocated: Number(r.budgetAllocated),
                executed: Number(r.budgetExecuted),
                area: r.area?.name ?? null,
              })),
            }))
          );
          filename = "investimentos.xlsx";
        } else {
          return NextResponse.json({ error: "PDF de investimentos não disponível — use Excel" }, { status: 400 });
        }
        break;
      }

      default:
        return NextResponse.json({ error: "Tipo não suportado" }, { status: 400 });
    }

    const contentType = format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Erro ao gerar exportação" }, { status: 500 });
  }
}
