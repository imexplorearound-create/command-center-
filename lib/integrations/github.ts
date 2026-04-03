import { prisma } from "@/lib/db";
import crypto from "crypto";

// ─── HMAC Verification ─────────────────────────────────────

export function verifyGithubSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// ─── Author Mapping ────────────────────────────────────────

async function mapAuthor(
  githubUsername: string
): Promise<string | null> {
  const person = await prisma.person.findFirst({
    where: { githubUsername: { equals: githubUsername, mode: "insensitive" } },
    select: { id: true },
  });
  return person?.id ?? null;
}

// ─── Task Linking ──────────────────────────────────────────

const CC_REF_PATTERN = /CC-(\d+)|#?([a-z0-9-]+)/i;

async function findTaskByRef(
  text: string,
  projectId: string | null
): Promise<{ taskId: string; method: string; confidence: number } | null> {
  if (!text) return null;

  // 1. Explicit CC-## reference (search by position in task list)
  const ccMatch = text.match(/CC-(\d+)/i);
  if (ccMatch) {
    // CC-## refers to task title containing that ref, or just search broadly
    const tasks = await prisma.task.findMany({
      where: projectId ? { projectId } : {},
      select: { id: true, title: true },
    });
    // Look for task with CC-## in origin_ref or by index
    const taskNum = parseInt(ccMatch[1]);
    if (taskNum > 0 && taskNum <= tasks.length) {
      return { taskId: tasks[taskNum - 1].id, method: "cc_ref", confidence: 1.0 };
    }
  }

  // 2. Branch name matching — extract keywords and fuzzy match task titles
  const keywords = text
    .replace(/^(feature|fix|hotfix|bugfix|chore)\//i, "")
    .replace(/CC-\d+[-_]?/i, "")
    .split(/[-_/]/)
    .filter((w) => w.length > 2)
    .map((w) => w.toLowerCase());

  if (keywords.length > 0 && projectId) {
    const tasks = await prisma.task.findMany({
      where: { projectId, status: { not: "feito" } },
      select: { id: true, title: true },
    });

    let bestMatch: { id: string; score: number } | null = null;
    for (const task of tasks) {
      const titleWords = task.title.toLowerCase().split(/\s+/);
      const matches = keywords.filter((k) =>
        titleWords.some((tw) => tw.includes(k))
      );
      const score = matches.length / keywords.length;
      if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { id: task.id, score };
      }
    }

    if (bestMatch) {
      return {
        taskId: bestMatch.id,
        method: "branch_match",
        confidence: bestMatch.score,
      };
    }
  }

  return null;
}

// ─── Dev Status Updates ────────────────────────────────────

async function updateTaskDevStatus(
  taskId: string,
  devStatus: string,
  prData?: { number: number; status: string; url: string },
  branch?: string
) {
  const updateData: Record<string, unknown> = { devStatus };

  if (branch) updateData.githubBranch = branch;
  if (prData) {
    updateData.githubPrNumber = prData.number;
    updateData.githubPrStatus = prData.status;
    updateData.githubPrUrl = prData.url;
  }

  // Auto-move kanban status based on dev status
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { status: true },
  });

  if (task) {
    if (devStatus === "em_desenvolvimento" && task.status === "a_fazer") {
      updateData.status = "em_curso";
    } else if (devStatus === "em_review") {
      updateData.status = "em_revisao";
    } else if (devStatus === "merged") {
      updateData.status = "feito";
      updateData.completedAt = new Date();
    }
  }

  await prisma.task.update({ where: { id: taskId }, data: updateData });
}

// ─── Metrics Update ────────────────────────────────────────

async function updateDailyMetrics(
  repoId: string,
  date: Date,
  field: string,
  increment: number = 1
) {
  const dateOnly = new Date(date.toISOString().split("T")[0]);

  await prisma.devMetricsDaily.upsert({
    where: { repoId_date: { repoId, date: dateOnly } },
    create: { repoId, date: dateOnly, [field]: increment },
    update: { [field]: { increment } },
  });
}

// ─── Main Event Processor ──────────────────────────────────

export async function processGithubEvent(
  eventType: string,
  payload: Record<string, unknown>
) {
  const repoFullName = (payload.repository as Record<string, unknown>)
    ?.full_name as string;
  if (!repoFullName) return { processed: false, reason: "no repository" };

  const repo = await prisma.githubRepo.findUnique({
    where: { repoFullName },
    select: { id: true, projectId: true },
  });
  if (!repo) return { processed: false, reason: "repo not registered" };

  const action = payload.action as string | undefined;
  const now = new Date();

  switch (eventType) {
    case "push": {
      const commits = (payload.commits as Array<Record<string, unknown>>) ?? [];
      const branch = ((payload.ref as string) ?? "").replace("refs/heads/", "");
      const headCommit = payload.head_commit as Record<string, unknown> | null;

      for (const commit of commits) {
        const author = (commit.author as Record<string, unknown>)?.username as string ?? "";
        const authorId = await mapAuthor(author);
        const message = (commit.message as string) ?? "";
        const taskLink = await findTaskByRef(
          message + " " + branch,
          repo.projectId
        );

        await prisma.githubEvent.create({
          data: {
            repoId: repo.id,
            eventType: "push",
            title: message.split("\n")[0].slice(0, 500),
            author,
            authorMappedId: authorId,
            branch,
            commitSha: (commit.id as string)?.slice(0, 40),
            url: commit.url as string,
            taskId: taskLink?.taskId,
            taskLinkMethod: taskLink?.method,
            taskLinkConfidence: taskLink?.confidence,
            rawPayload: commit as object,
            eventAt: new Date((commit.timestamp as string) ?? now),
          },
        });

        if (taskLink) {
          await updateTaskDevStatus(taskLink.taskId, "em_desenvolvimento", undefined, branch);
          await prisma.task.update({
            where: { id: taskLink.taskId },
            data: { githubLastCommitAt: now },
          });
        }
      }

      await updateDailyMetrics(repo.id, now, "commitsCount", commits.length);
      break;
    }

    case "pull_request": {
      const pr = payload.pull_request as Record<string, unknown>;
      if (!pr) break;

      const prNumber = pr.number as number;
      const prTitle = (pr.title as string) ?? "";
      const prBody = (pr.body as string) ?? "";
      const prUrl = pr.html_url as string;
      const branch = (pr.head as Record<string, unknown>)?.ref as string ?? "";
      const author = (pr.user as Record<string, unknown>)?.login as string ?? "";
      const authorId = await mapAuthor(author);
      const isDraft = pr.draft as boolean;
      const merged = pr.merged as boolean;

      const taskLink = await findTaskByRef(
        prTitle + " " + prBody + " " + branch,
        repo.projectId
      );

      await prisma.githubEvent.create({
        data: {
          repoId: repo.id,
          eventType: "pull_request",
          action,
          title: prTitle.slice(0, 500),
          description: (prBody ?? "").slice(0, 2000),
          author,
          authorMappedId: authorId,
          branch,
          prNumber,
          url: prUrl,
          taskId: taskLink?.taskId,
          taskLinkMethod: taskLink?.method,
          taskLinkConfidence: taskLink?.confidence,
          rawPayload: { number: prNumber, title: prTitle, state: pr.state as string, draft: isDraft, merged },
          eventAt: new Date((pr.updated_at as string) ?? now),
        },
      });

      if (taskLink) {
        let devStatus = "em_desenvolvimento";
        let prStatus = "open";

        if (action === "opened" || action === "reopened" || action === "ready_for_review") {
          if (!isDraft) {
            devStatus = "em_review";
            prStatus = "open";
          }
        } else if (action === "closed") {
          if (merged) {
            devStatus = "merged";
            prStatus = "merged";
          } else {
            devStatus = "em_desenvolvimento";
            prStatus = "closed";
          }
        }

        await updateTaskDevStatus(taskLink.taskId, devStatus, {
          number: prNumber,
          status: prStatus,
          url: prUrl,
        }, branch);
      }

      if (action === "opened") {
        await updateDailyMetrics(repo.id, now, "prsOpened");
      } else if (action === "closed" && merged) {
        await updateDailyMetrics(repo.id, now, "prsMerged");
      } else if (action === "closed" && !merged) {
        await updateDailyMetrics(repo.id, now, "prsClosed");
      }
      break;
    }

    case "deployment_status":
    case "workflow_run": {
      const deployment = (payload.deployment_status ?? payload.workflow_run) as Record<string, unknown>;
      if (!deployment) break;

      const state = (deployment.state ?? deployment.conclusion) as string;
      const isSuccess = state === "success";
      const isFailure = state === "failure" || state === "error";
      const author = (deployment.creator ?? (payload.sender as Record<string, unknown>))
        ? ((payload.sender as Record<string, unknown>)?.login as string ?? "")
        : "";
      const authorId = await mapAuthor(author);

      await prisma.githubEvent.create({
        data: {
          repoId: repo.id,
          eventType: eventType === "deployment_status" ? "deploy" : "workflow_run",
          action: state,
          title: `Deploy ${state}`,
          author,
          authorMappedId: authorId,
          branch: (deployment.environment as string) ?? "",
          url: (deployment.target_url ?? deployment.html_url) as string,
          rawPayload: { state, environment: deployment.environment as string },
          eventAt: new Date((deployment.updated_at as string) ?? now),
        },
      });

      if (isSuccess) {
        await updateDailyMetrics(repo.id, now, "deploysSuccess");
      } else if (isFailure) {
        await updateDailyMetrics(repo.id, now, "deploysFailed");

        // Create alert for failed deploy
        await prisma.alert.create({
          data: {
            type: "deploy_falhado",
            severity: "critical",
            title: `Deploy falhado em ${repoFullName}`,
            description: `Estado: ${state}. Autor: ${author}`,
            relatedProjectId: repo.projectId,
          },
        });
      }
      break;
    }

    case "issues": {
      const issue = payload.issue as Record<string, unknown>;
      if (!issue || action !== "opened") break;

      const title = (issue.title as string) ?? "";
      const author = (issue.user as Record<string, unknown>)?.login as string ?? "";
      const authorId = await mapAuthor(author);

      await prisma.githubEvent.create({
        data: {
          repoId: repo.id,
          eventType: "issue",
          action: "opened",
          title: title.slice(0, 500),
          description: ((issue.body as string) ?? "").slice(0, 2000),
          author,
          authorMappedId: authorId,
          url: issue.html_url as string,
          rawPayload: { number: issue.number as number, title, state: issue.state as string },
          eventAt: new Date((issue.created_at as string) ?? now),
        },
      });

      await updateDailyMetrics(repo.id, now, "issuesOpened");

      // Create task from issue (AI-extracted, needs confirmation)
      if (repo.projectId) {
        await prisma.task.create({
          data: {
            title: `[GitHub] ${title}`,
            projectId: repo.projectId,
            assigneeId: authorId,
            status: "backlog",
            priority: "media",
            origin: "github",
            originRef: issue.html_url as string,
            aiExtracted: true,
            aiConfidence: 0.6,
            validationStatus: "por_confirmar",
          },
        });
      }
      break;
    }
  }

  // Update repo last synced
  await prisma.githubRepo.update({
    where: { id: repo.id },
    data: { lastSyncedAt: now },
  });

  // Log sync
  await prisma.syncLog.create({
    data: {
      source: "github",
      action: `webhook:${eventType}`,
      status: "success",
      itemsProcessed: 1,
    },
  });

  return { processed: true, eventType, repo: repoFullName };
}

// ─── GitHub API Polling (fallback sync) ────────────────────

export async function syncGithubRepo(repoFullName: string, token: string) {
  const repo = await prisma.githubRepo.findUnique({
    where: { repoFullName },
    select: { id: true, projectId: true, defaultBranch: true, lastSyncedAt: true },
  });
  if (!repo) return;

  const since = repo.lastSyncedAt
    ? repo.lastSyncedAt.toISOString()
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const start = Date.now();
  let itemsProcessed = 0;

  try {
    // Fetch recent commits
    const commitsRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/commits?since=${since}&per_page=30`,
      { headers }
    );
    if (commitsRes.ok) {
      const commits = (await commitsRes.json()) as Array<Record<string, unknown>>;
      for (const c of commits) {
        const sha = (c.sha as string).slice(0, 40);
        const existing = await prisma.githubEvent.findFirst({
          where: { repoId: repo.id, commitSha: sha },
        });
        if (existing) continue;

        const commit = c.commit as Record<string, unknown>;
        const author = (c.author as Record<string, unknown>)?.login as string ?? "";
        const authorId = await mapAuthor(author);
        const message = (commit.message as string) ?? "";

        await prisma.githubEvent.create({
          data: {
            repoId: repo.id,
            eventType: "push",
            title: message.split("\n")[0].slice(0, 500),
            author,
            authorMappedId: authorId,
            commitSha: sha,
            url: c.html_url as string,
            eventAt: new Date(
              (commit.committer as Record<string, unknown>)?.date as string
            ),
          },
        });
        itemsProcessed++;
      }
    }

    // Fetch open PRs
    const prsRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/pulls?state=open&per_page=30`,
      { headers }
    );
    if (prsRes.ok) {
      const prs = (await prsRes.json()) as Array<Record<string, unknown>>;
      for (const pr of prs) {
        const prNumber = pr.number as number;
        const existing = await prisma.githubEvent.findFirst({
          where: { repoId: repo.id, prNumber, eventType: "pull_request" },
          orderBy: { eventAt: "desc" },
        });
        // Skip if we already have a recent event for this PR
        if (existing && Date.now() - existing.eventAt.getTime() < 3600000) continue;

        const author = (pr.user as Record<string, unknown>)?.login as string ?? "";
        const authorId = await mapAuthor(author);

        await prisma.githubEvent.create({
          data: {
            repoId: repo.id,
            eventType: "pull_request",
            action: "open",
            title: ((pr.title as string) ?? "").slice(0, 500),
            author,
            authorMappedId: authorId,
            branch: (pr.head as Record<string, unknown>)?.ref as string,
            prNumber,
            url: pr.html_url as string,
            eventAt: new Date((pr.updated_at as string) ?? new Date()),
          },
        });
        itemsProcessed++;
      }
    }

    await prisma.githubRepo.update({
      where: { id: repo.id },
      data: { lastSyncedAt: new Date() },
    });

    await prisma.syncLog.create({
      data: {
        source: "github",
        action: `poll:${repoFullName}`,
        status: "success",
        itemsProcessed,
        durationMs: Date.now() - start,
      },
    });
  } catch (error) {
    await prisma.syncLog.create({
      data: {
        source: "github",
        action: `poll:${repoFullName}`,
        status: "error",
        errorMessage: (error as Error).message,
        durationMs: Date.now() - start,
      },
    });
  }
}
