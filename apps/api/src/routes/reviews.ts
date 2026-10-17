import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { reviews, submissions, projects, milestones, verifiedSkills, auditLog } from "../db/schema";
import { authMiddleware, requireRole } from "../middleware/auth";
import { transitionProjectStatus, canTransition, type ProjectStatus } from "../lib/stateMachine";
import type { DB } from "../db";
import type { AppEnv, AuthUser } from "../types";

const reviewSchema = z.object({
  submissionId: z.string(),
  rubricScores: z.array(
    z.object({
      criterion: z.string(),
      score: z.number().min(1).max(4),
    })
  ),
  comments: z.string(),
  decision: z.enum(["approved", "revision", "rejected"]),
});

export function reviewRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);

  app.post("/:submissionId/review", requireRole("mentor"), async (c) => {
    const db = c.var.db;
    const user = c.get("user") as AuthUser;
    const { submissionId } = c.req.param();
    const body = await c.req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
    if (!submission) return c.json({ error: "Submission not found" }, 404);

    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, submission.milestoneId));
    if (!milestone) return c.json({ error: "Milestone not found" }, 404);

    const [project] = await db.select().from(projects).where(eq(projects.id, milestone.projectId));
    if (!project) return c.json({ error: "Project not found" }, 404);

    const id = crypto.randomUUID();
    await db.insert(reviews).values({
      id,
      submissionId,
      reviewerId: user.id,
      reviewerType: "mentor",
      rubricScores: JSON.stringify(parsed.data.rubricScores),
      comments: parsed.data.comments,
      decision: parsed.data.decision,
    });

    if (parsed.data.decision === "approved") {
      await db.update(milestones).set({ status: "approved" }).where(eq(milestones.id, milestone.id));

      const allMilestones = await db.select().from(milestones).where(eq(milestones.projectId, project.id));
      if (allMilestones.every((m) => m.status === "approved")) {
        await transitionSafely(db, project.id, "under_review", user.id);
        await transitionSafely(db, project.id, "completed", user.id);

        const rubric: { criterion: string }[] = JSON.parse(project.rubric || "[]");
        const scores = parsed.data.rubricScores;
        const avg = scores.length ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 3;

        let level: "Beginner" | "Intermediate" | "Advanced";
        if (avg >= 3.5) level = "Advanced";
        else if (avg >= 2.5) level = "Intermediate";
        else level = "Beginner";

        for (const r of rubric) {
          const already = await db
            .select()
            .from(verifiedSkills)
            .where(eq(verifiedSkills.projectId, project.id));
          if (already.some((v) => v.skill === r.criterion && v.userId === submission.applicantId)) continue;

          await db.insert(verifiedSkills).values({
            id: crypto.randomUUID(),
            userId: submission.applicantId,
            skill: r.criterion,
            level,
            projectId: project.id,
            reviewId: id,
          });
        }

        await db.insert(auditLog).values({
          id: crypto.randomUUID(),
          actorId: user.id,
          action: "project_completed",
          entity: "project",
          entityId: project.id,
          details: JSON.stringify({ verifiedSkills: rubric.map((r) => r.criterion) }),
        });
      }
    } else if (parsed.data.decision === "revision") {
      await transitionSafely(db, project.id, "revision_requested", user.id);
    }

    return c.json({ id, decision: parsed.data.decision }, 201);
  });

  return app;
}

async function transitionSafely(db: DB, projectId: string, to: ProjectStatus, actorId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return;
  if (!canTransition(project.status, to)) return;
  await transitionProjectStatus(db, projectId, to, actorId);
}
