import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveHeaderTenant } from "@/lib/tenant";
import { syncGithubRepo } from "@/lib/integrations/github";

/**
 * GitHub polling sync — fallback for when webhooks miss events.
 * Called by cron or manually: GET /api/sync/github
 * Optionally pass ?repo=owner/repo to sync a specific repo.
 */
export async function GET(request: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN not configured" },
      { status: 500 }
    );
  }

  // Verify caller is authorized (either internal or with sync secret)
  const secret = process.env.SYNC_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const repoParam = request.nextUrl.searchParams.get("repo");

  // Resolve tenant from header or default
  const db = await resolveHeaderTenant(request.headers.get("x-tenant-id"));

  try {
    const repos = repoParam
      ? await db.githubRepo.findMany({
          where: { repoFullName: repoParam, isActive: true },
          select: { repoFullName: true },
        })
      : await db.githubRepo.findMany({
          where: { isActive: true },
          select: { repoFullName: true },
        });

    const results = [];
    for (const repo of repos) {
      await syncGithubRepo(repo.repoFullName, token);
      results.push(repo.repoFullName);
    }

    return NextResponse.json({ synced: results });
  } catch (error) {
    console.error("GitHub sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
