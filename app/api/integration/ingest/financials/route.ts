import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateIntegration } from "../../auth";
import { ingestFinancialsBodySchema } from "@/lib/validation/ingest-schema";

/**
 * POST /api/integration/ingest/financials
 *
 * Updates budgetExecuted on InvestmentRubric records.
 * Body: { entries: [{ projectSlug, rubricName, budgetExecuted }] }
 */
export async function POST(request: NextRequest) {
  const authResult = await authenticateIntegration(request);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json();
    const parsed = ingestFinancialsBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const start = Date.now();
    let updated = 0;
    const errors: string[] = [];

    for (const entry of parsed.data.entries) {
      try {
        // Resolve project by slug
        const project = await db.project.findFirst({
          where: { slug: entry.projectSlug },
          select: { id: true },
        });

        if (!project) {
          errors.push(`Project not found: ${entry.projectSlug}`);
          continue;
        }

        // Find the InvestmentMap for this project
        const investmentMap = await db.investmentMap.findFirst({
          where: { projectId: project.id },
          select: { id: true },
        });

        if (!investmentMap) {
          errors.push(`No investment map for project: ${entry.projectSlug}`);
          continue;
        }

        // Find rubric by name within the investment map
        const rubric = await db.investmentRubric.findFirst({
          where: {
            investmentMapId: investmentMap.id,
            name: entry.rubricName,
            archivedAt: null,
          },
        });

        if (!rubric) {
          errors.push(`Rubric "${entry.rubricName}" not found in project: ${entry.projectSlug}`);
          continue;
        }

        await db.investmentRubric.update({
          where: { id: rubric.id },
          data: { budgetExecuted: entry.budgetExecuted },
        });

        updated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed for ${entry.projectSlug}/${entry.rubricName}: ${msg}`);
      }
    }

    await db.syncLog.create({
      data: {
        tenantId: "",
        source: "integration",
        action: "ingest-financials",
        status: errors.length > 0 ? "partial" : "success",
        itemsProcessed: updated,
        errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
        durationMs: Date.now() - start,
      },
    });

    return NextResponse.json({ updated, errors });
  } catch (error) {
    console.error("Ingest financials error:", error);
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
  }
}
