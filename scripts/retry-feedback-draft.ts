/**
 * Re-corre extracção AI sobre items de feedback existentes (transcrição já feita).
 *
 * Uso:
 *   pnpm tsx scripts/retry-feedback-draft.ts <itemId> [<itemId> ...]
 *   pnpm tsx scripts/retry-feedback-draft.ts --all-pending      # todos sem ai_drafted_at
 */

// Stub server-only é injectado via NODE_OPTIONS=--require=./scripts/_stub-server-only.cjs

import { config } from "dotenv";
import { join } from "path";

config({ path: ".env.local" });

import { basePrisma } from "@/lib/db";
import { extractFeedbackDraft, type FeedbackClassification } from "@/lib/feedback-classify";

async function processItem(itemId: string) {
  const item = await basePrisma.feedbackItem.findUnique({
    where: { id: itemId },
    include: {
      session: { include: { project: { select: { slug: true } } } },
    },
  });
  if (!item) {
    console.error(`✗ ${itemId}: não encontrado`);
    return;
  }
  if (!item.voiceTranscript) {
    console.error(`✗ ${itemId}: sem transcript`);
    return;
  }

  const classification: FeedbackClassification = {
    classification: (item.classification as FeedbackClassification["classification"]) ?? "other",
    module: item.module ?? "geral",
    priority: (item.priority as FeedbackClassification["priority"]) ?? "media",
    summary: item.aiSummary ?? "",
  };

  const events = Array.isArray(item.contextSnapshot) ? item.contextSnapshot : undefined;

  const publicDir = join(process.cwd(), "public");
  const screenshotPaths = item.screenshotUrl
    ? [join(publicDir, item.screenshotUrl.replace(/^\//, ""))]
    : [];

  console.log(`→ ${itemId.slice(0, 8)}... a chamar AI (transcript ${item.voiceTranscript.length} chars, ${screenshotPaths.length} screenshots)`);

  const draft = await extractFeedbackDraft({
    transcript: item.voiceTranscript,
    classification,
    events,
    pageUrl: item.pageUrl ?? undefined,
    pageTitle: item.pageTitle ?? undefined,
    projectSlug: item.session.project?.slug ?? "",
    screenshotPaths,
  });

  if (!draft) {
    console.error(`✗ ${itemId.slice(0, 8)}: AI devolveu null (Gemini + MiniMax falharam)`);
    return;
  }

  await basePrisma.feedbackItem.update({
    where: { id: itemId },
    data: {
      expectedResult: draft.expectedResult,
      actualResult: draft.actualResult,
      reproSteps: draft.reproSteps,
      acceptanceCriteria: draft.acceptanceCriteria,
      priority: draft.suggestedPriority,
      aiDraftedAt: new Date(),
    },
  });

  console.log(`✓ ${itemId.slice(0, 8)}: ${draft.reproSteps.length} steps, prioridade ${draft.suggestedPriority}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Uso: pnpm tsx scripts/retry-feedback-draft.ts <itemId> [...] | --all-pending");
    process.exit(1);
  }

  let ids: string[];
  if (args[0] === "--all-pending") {
    const items = await basePrisma.feedbackItem.findMany({
      where: { aiDraftedAt: null, voiceTranscript: { not: null }, archivedAt: null },
      select: { id: true },
    });
    ids = items.map((i) => i.id);
    console.log(`Encontrados ${ids.length} items pendentes`);
  } else {
    ids = args;
  }

  for (const id of ids) {
    await processItem(id);
  }
  await basePrisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
