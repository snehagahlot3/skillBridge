// Single-agent code review engine.
// Fetches a commit diff, chunks it for the model's context window, runs one
// Workers AI review per chunk, and aggregates the reports.

import { eq, and } from "drizzle-orm";
import { aiRepos, reviewRuns, jobs, jobUpdates } from "../db/schema";
import type { DB } from "../db";
import { createDb } from "../db";
import { decryptToken } from "./crypto";
import * as gh from "./githubClient";
import type { GhPullRequest } from "./githubClient";
import type { Env } from "../types";
import { AI_MODEL, aiResponseText } from "./aiModel";

const CHUNK_CHARS = 3500;
const MAX_CHUNKS = 6;

const REVIEW_SYSTEM = `You are a senior code reviewer. Review the given git diff and respond with ONLY valid JSON, no markdown fences, matching exactly:
{
  "summary": "2-3 sentence overall assessment",
  "rating": <integer 1..5, 5=excellent>,
  "findings": [
    {"file": "path", "line": <number or null>, "severity": "critical|high|medium|low",
     "issue": "what is wrong", "suggestion": "how to fix it"}
  ],
  "suggestedFixes": ["concrete fix description"]
}
If the diff looks fine, return an empty findings array and a positive summary. Be specific; reference actual lines where possible.`;

export interface ReviewFinding {
  file: string;
  line: number | null;
  severity: "critical" | "high" | "medium" | "low";
  issue: string;
  suggestion: string;
}

export interface ReviewReport {
  summary: string;
  rating: number;
  findings: ReviewFinding[];
  suggestedFixes: string[];
}

export interface ReviewOutcome {
  sha: string;
  message: string;
  report: ReviewReport | null; // null when there is nothing to review (empty diff)
  tokensUsed: number;
}

function chunkDiff(diff: string): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const line of diff.split("\n")) {
    if (current.length + line.length > CHUNK_CHARS && current) {
      chunks.push(current);
      current = "";
    }
    current += line + "\n";
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

function parseReport(text: string): ReviewReport | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const data = JSON.parse(match[0]) as Partial<ReviewReport>;
    return {
      summary: String(data.summary || "No summary provided."),
      rating: Math.min(5, Math.max(1, Math.round(Number(data.rating) || 3))),
      findings: Array.isArray(data.findings)
        ? data.findings.slice(0, 20).map((f: any) => ({
            file: String(f.file || "unknown"),
            line: f.line == null ? null : Number(f.line),
            severity: ["critical", "high", "medium", "low"].includes(f.severity) ? f.severity : "low",
            issue: String(f.issue || ""),
            suggestion: String(f.suggestion || ""),
          }))
        : [],
      suggestedFixes: Array.isArray(data.suggestedFixes)
        ? data.suggestedFixes.slice(0, 10).map((s: any) => String(s))
        : [],
    };
  } catch {
    return null;
  }
}

export async function reviewDiff(
  env: Env,
  diff: string
): Promise<{ report: ReviewReport; tokensUsed: number }> {
  if (!diff || !diff.trim()) {
    return {
      report: { summary: "No changes to review.", rating: 3, findings: [], suggestedFixes: [] },
      tokensUsed: 0,
    };
  }

  const chunks = chunkDiff(diff).slice(0, MAX_CHUNKS);
  const reports: ReviewReport[] = [];
  let tokensUsed = 0;

  for (const chunk of chunks) {
    const response = await env.AI.run(AI_MODEL, {
      messages: [
        { role: "system", content: REVIEW_SYSTEM },
        { role: "user", content: `Review this git diff:\n\n${chunk}` },
      ],
      max_tokens: 65536,
    });
    const text = aiResponseText(response);
    const parsed = parseReport(text);
    if (parsed) reports.push(parsed);
    tokensUsed += chunk.length + text.length;
  }

  if (!reports.length) {
    return {
      report: {
        summary: "The AI reviewer could not produce a report for this diff.",
        rating: 3,
        findings: [],
        suggestedFixes: [],
      },
      tokensUsed,
    };
  }

  const allFindings = reports.flatMap((r) => r.findings);
  const allFixes = reports.flatMap((r) => r.suggestedFixes);
  const avgRating = Math.round(reports.reduce((s, r) => s + r.rating, 0) / reports.length);

  return {
    report: {
      summary: reports.map((r) => r.summary).join(" "),
      rating: avgRating,
      findings: allFindings,
      suggestedFixes: allFixes,
    },
    tokensUsed,
  };
}

export async function reviewCommit(
  env: Env,
  owner: string,
  repo: string,
  branch: string,
  token: string,
  github: {
    getLatestCommit: typeof import("./githubClient").getLatestCommit;
    getCommitDiff: typeof import("./githubClient").getCommitDiff;
  }
): Promise<ReviewOutcome> {
  const { sha, message } = await github.getLatestCommit(env, owner, repo, branch, token);
  const diff = await github.getCommitDiff(env, owner, repo, sha, token);

  if (!diff || !diff.trim()) {
    return { sha, message, report: null, tokensUsed: 0 };
  }

  const { report, tokensUsed } = await reviewDiff(env, diff);
  return { sha, message, report, tokensUsed };
}

export function formatReport(sha: string, message: string, report: ReviewReport): string {
  const lines = [
    "## 🤖 SkillBridge AI Code Review",
    `Commit \`${sha.slice(0, 7)}\` — ${message}`,
    "",
    `**Rating:** ${"★".repeat(report.rating)}${"☆".repeat(5 - report.rating)} (${report.rating}/5)`,
    "",
    report.summary,
  ];
  if (report.findings.length) {
    lines.push("", "### Findings");
    for (const f of report.findings) {
      lines.push(
        `- **[${f.severity}]** \`${f.file}${f.line ? ":" + f.line : ""}\` — ${f.issue} → ${f.suggestion}`
      );
    }
  }
  if (report.suggestedFixes.length) {
    lines.push("", "### Suggested fixes");
    for (const s of report.suggestedFixes) lines.push(`- ${s}`);
  }
  lines.push("", "---", "*Generated by the SkillBridge AI code-review agent.*");
  return lines.join("\n");
}

// Shared runner used by the "Review now" endpoint and the cron poller.
export async function runReviewForRepo(
  env: Env,
  db: DB,
  repo: typeof aiRepos.$inferSelect
): Promise<typeof reviewRuns.$inferSelect> {
  const token = await decryptToken(repo.tokenEnc, env.JWT_SECRET);

  const runId = crypto.randomUUID();
  await db.insert(reviewRuns).values({
    id: runId,
    repoId: repo.id,
    commitSha: "",
    status: "running",
  });

  try {
    const outcome = await reviewCommit(env, repo.owner, repo.repo, repo.branch, token, {
      getLatestCommit: gh.getLatestCommit,
      getCommitDiff: gh.getCommitDiff,
    });

    let commentUrl: string | null = null;
    if (outcome.report) {
      const comment = await gh.postCommitComment(
        env,
        repo.owner,
        repo.repo,
        outcome.sha,
        formatReport(outcome.sha, outcome.message, outcome.report),
        token
      );
      commentUrl = comment.html_url;
    }

    await db
      .update(reviewRuns)
      .set({
        status: "done",
        commitSha: outcome.sha,
        commitMessage: outcome.message,
        summary: outcome.report?.summary ?? "No changes to review.",
        rating: outcome.report?.rating ?? null,
        findings: JSON.stringify(outcome.report?.findings ?? []),
        suggestedFixes: JSON.stringify(outcome.report?.suggestedFixes ?? []),
        commentUrl,
        tokensUsed: outcome.tokensUsed,
      })
      .where(eq(reviewRuns.id, runId));
    await db
      .update(aiRepos)
      .set({ lastReviewedSha: outcome.sha })
      .where(eq(aiRepos.id, repo.id));

    // If the repo is linked to a job, surface the review in the job's
    // progress timeline (visible to owner, team and mentor).
    if (repo.jobId && outcome.report) {
      const [job] = await db.select().from(jobs).where(eq(jobs.id, repo.jobId));
      if (job) {
        const report = outcome.report;
        const topFindings = report.findings
          .slice(0, 3)
          .map((f) => `[${f.severity}] ${f.file}${f.line ? ":" + f.line : ""} — ${f.issue}`)
          .join(" · ");
        await db.insert(jobUpdates).values({
          id: crypto.randomUUID(),
          jobId: repo.jobId,
          authorId: repo.userId,
          kind: "update",
          content: [
            `🤖 AI code review: ${report.rating}/5 for commit \`${outcome.sha.slice(0, 7)}\` (${repo.owner}/${repo.repo})`,
            report.summary,
            topFindings,
            commentUrl,
          ]
            .filter(Boolean)
            .join("\n"),
        });
      }
    }

    const [run] = await db.select().from(reviewRuns).where(eq(reviewRuns.id, runId));
    return run;
  } catch (err) {
    console.error("review failed:", err);
    await db.update(reviewRuns).set({ status: "failed" }).where(eq(reviewRuns.id, runId));
    const [run] = await db.select().from(reviewRuns).where(eq(reviewRuns.id, runId));
    return run;
  }
}

// Cron entrypoint: review new commits on all active repos.
export async function pollAllRepos(env: Env): Promise<void> {
  if (env.AI_GITHUB_MOCK === "1") return; // never auto-poll in mock mode
  const db = createDb(env.DB);
  const repos = await db.select().from(aiRepos).where(eq(aiRepos.status, "active"));
  for (const repo of repos) {
    try {
      const token = await decryptToken(repo.tokenEnc, env.JWT_SECRET);
      const { sha } = await gh.getLatestCommit(env, repo.owner, repo.repo, repo.branch, token);
      if (sha === repo.lastReviewedSha) continue;
      await runReviewForRepo(env, db, repo);
    } catch (err) {
      console.error(`poll failed for ${repo.owner}/${repo.repo}:`, err);
    }
  }
}

// ---- PR reviews ----

export async function reviewPullRequest(
  env: Env,
  owner: string,
  repo: string,
  prNumber: number,
  token: string
): Promise<{ pr: GhPullRequest; report: ReviewReport; tokensUsed: number }> {
  const pr = await gh.getPullRequest(env, owner, repo, prNumber, token);
  const diff = await gh.getPrDiff(env, owner, repo, prNumber, token);
  const { report, tokensUsed } = await reviewDiff(env, diff);
  return { pr, report, tokensUsed };
}

export async function runReviewForPr(
  env: Env,
  db: DB,
  repo: typeof aiRepos.$inferSelect,
  prNumber: number
): Promise<typeof reviewRuns.$inferSelect> {
  const token = await decryptToken(repo.tokenEnc, env.JWT_SECRET);

  const runId = crypto.randomUUID();
  await db.insert(reviewRuns).values({
    id: runId,
    repoId: repo.id,
    commitSha: "",
    status: "running",
    kind: "pr",
    prNumber,
  });

  try {
    const { pr, report, tokensUsed } = await reviewPullRequest(env, repo.owner, repo.repo, prNumber, token);

    // PR-level review comment (always)
    const comment = await gh.postPrReviewComment(
      env,
      repo.owner,
      repo.repo,
      prNumber,
      formatPrReport(pr, report),
      token
    );

    // Best-effort inline comments on up to 3 findings
    let inlineCount = 0;
    for (const f of report.findings) {
      if (inlineCount >= 3 || !f.line) continue;
      try {
        await gh.postPrInlineComment(
          env,
          repo.owner,
          repo.repo,
          prNumber,
          pr.head.sha,
          f.file,
          f.line,
          `[${f.severity}] ${f.issue} — ${f.suggestion}`,
          token
        );
        inlineCount += 1;
      } catch {
        // inline position may not map to the diff; skip silently
      }
    }

    await db
      .update(reviewRuns)
      .set({
        status: "done",
        commitSha: pr.head.sha,
        commitMessage: `PR #${pr.number}: ${pr.title}`,
        summary: report.summary,
        rating: report.rating,
        findings: JSON.stringify(report.findings),
        suggestedFixes: JSON.stringify(report.suggestedFixes),
        commentUrl: comment.html_url,
        tokensUsed,
      })
      .where(eq(reviewRuns.id, runId));

    if (repo.jobId) {
      const [job] = await db.select().from(jobs).where(eq(jobs.id, repo.jobId));
      if (job) {
        await db.insert(jobUpdates).values({
          id: crypto.randomUUID(),
          jobId: repo.jobId,
          authorId: repo.userId,
          kind: "update",
          content: `🤖 AI PR review: ${report.rating}/5 for PR #${pr.number} "${pr.title}" (${repo.owner}/${repo.repo})\n${report.summary}\n${comment.html_url}`,
        });
      }
    }

    const [run] = await db.select().from(reviewRuns).where(eq(reviewRuns.id, runId));
    return run;
  } catch (err) {
    console.error("PR review failed:", err);
    await db.update(reviewRuns).set({ status: "failed" }).where(eq(reviewRuns.id, runId));
    const [run] = await db.select().from(reviewRuns).where(eq(reviewRuns.id, runId));
    return run;
  }
}

function formatPrReport(pr: GhPullRequest, report: ReviewReport): string {
  const lines = [
    "## 🤖 SkillBridge AI Code Review",
    `PR #${pr.number} — ${pr.title}`,
    "",
    `**Rating:** ${"★".repeat(report.rating)}${"☆".repeat(5 - report.rating)} (${report.rating}/5)`,
    "",
    report.summary,
  ];
  if (report.findings.length) {
    lines.push("", "### Findings");
    for (const f of report.findings) {
      lines.push(
        `- **[${f.severity}]** \`${f.file}${f.line ? ":" + f.line : ""}\` — ${f.issue} → ${f.suggestion}`
      );
    }
  }
  if (report.suggestedFixes.length) {
    lines.push("", "### Suggested fixes");
    for (const s of report.suggestedFixes) lines.push(`- ${s}`);
  }
  lines.push(
    "",
    "---",
    `Post \`@skillbridge approve\` or \`@skillbridge request-changes\` in a comment to act on this review.`,
    "*Generated by the SkillBridge AI code-review agent.*"
  );
  return lines.join("\n");
}

// ---- GitHub webhook handling ----

export interface WebhookPayload {
  action?: string;
  ref?: string;
  comment?: { body?: string; user?: { login?: string } };
  issue?: { number?: number };
  pull_request?: {
    number: number;
    title?: string;
    head?: { sha: string };
  };
  repository?: { full_name?: string };
}

export async function handleWebhookEvent(env: Env, payload: WebhookPayload): Promise<void> {
  const fullName = payload.repository?.full_name;
  if (!fullName) return;
  const [owner, repoName] = fullName.split("/");
  if (!owner || !repoName) return;

  const db = createDb(env.DB);
  const repos = await db.select().from(aiRepos).where(
    and(eq(aiRepos.owner, owner), eq(aiRepos.repo, repoName), eq(aiRepos.status, "active"))
  );
  if (!repos.length) return;

  const action = payload.action ?? "";

  // push -> review new commit
  if (payload.ref && payload.ref.startsWith("refs/heads/")) {
    for (const repo of repos) {
      try {
        await runReviewForRepo(env, db, repo);
      } catch (err) {
        console.error("webhook push review failed:", err);
      }
    }
    return;
  }

  // pull_request opened/synchronize/reopened -> PR review
  if (payload.pull_request?.number && ["opened", "synchronize", "reopened"].includes(action)) {
    for (const repo of repos) {
      try {
        await runReviewForPr(env, db, repo, payload.pull_request.number);
      } catch (err) {
        console.error("webhook PR review failed:", err);
      }
    }
    return;
  }

  // issue_comment with @skillbridge command -> formal PR review
  if (payload.comment?.body && payload.issue?.number) {
    const body = payload.comment.body;
    const command = body.includes("@skillbridge approve")
      ? "APPROVE"
      : body.includes("@skillbridge request-changes")
        ? "REQUEST_CHANGES"
        : null;
    if (!command) return;

    for (const repo of repos) {
      // only the repo's connected GitHub account may trigger formal reviews
      if (payload.comment.user?.login !== repo.ghLogin) continue;
      try {
        const token = await decryptToken(repo.tokenEnc, env.JWT_SECRET);
        await gh.postPrFormalReview(
          env,
          repo.owner,
          repo.repo,
          payload.issue.number,
          command,
          `@skillbridge ${command === "APPROVE" ? "approve" : "request-changes"} triggered by ${payload.comment.user.login}.`,
          token
        );
        if (repo.jobId) {
          const [job] = await db.select().from(jobs).where(eq(jobs.id, repo.jobId));
          if (job) {
            await db.insert(jobUpdates).values({
              id: crypto.randomUUID(),
              jobId: repo.jobId,
              authorId: repo.userId,
              kind: "update",
              content: `🤖 GitHub: PR #${payload.issue.number} ${command === "APPROVE" ? "approved" : "changes requested"} via @skillbridge.`,
            });
          }
        }
      } catch (err) {
        console.error("webhook command failed:", err);
      }
    }
  }
}