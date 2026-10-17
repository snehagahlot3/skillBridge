import { Hono } from "hono";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { milestones, jobs, jobUpdates, teamMembers } from "../db/schema";
import { authMiddleware, requireRole } from "../middleware/auth";
import type { AppEnv } from "../types";

const contentSchema = z.object({ content: z.string().min(1) });

async function onTeam(db: AppEnv["Variables"]["db"], jobId: string, userId: string) {
  const rows = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.jobId, jobId), eq(teamMembers.userId, userId)));
  return rows.length > 0;
}

export function milestoneRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);

  // Any hired team member submits work for a milestone
  app.post("/:id/submit", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();
    const body = await c.req.json();
    const parsed = contentSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, id));
    if (!milestone) return c.json({ error: "Milestone not found" }, 404);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, milestone.jobId));
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (!(await onTeam(db, job.id, user.id))) {
      return c.json({ error: "Only hired team members can submit work" }, 403);
    }
    if (milestone.status === "approved") {
      return c.json({ error: "Milestone already approved" }, 400);
    }

    await db.update(milestones).set({ status: "submitted" }).where(eq(milestones.id, id));
    await db.insert(jobUpdates).values({
      id: crypto.randomUUID(),
      jobId: job.id,
      authorId: user.id,
      kind: "submission",
      milestoneId: id,
      content: parsed.data.content,
    });

    return c.json({ ok: true });
  });

  // Mentor approves a milestone
  app.post("/:id/approve", requireRole("mentor", "admin"), async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();

    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, id));
    if (!milestone) return c.json({ error: "Milestone not found" }, 404);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, milestone.jobId));
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (job.mentorId !== user.id && user.role !== "admin") {
      return c.json({ error: "Only the assigned mentor can approve milestones" }, 403);
    }

    await db.update(milestones).set({ status: "approved" }).where(eq(milestones.id, id));
    await db.insert(jobUpdates).values({
      id: crypto.randomUUID(),
      jobId: job.id,
      authorId: user.id,
      kind: "approval",
      milestoneId: id,
      content: `Milestone approved: ${milestone.title}`,
    });

    return c.json({ ok: true });
  });

  // Mentor requests a revision
  app.post("/:id/revision", requireRole("mentor", "admin"), async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();
    const body = await c.req.json();
    const parsed = contentSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, id));
    if (!milestone) return c.json({ error: "Milestone not found" }, 404);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, milestone.jobId));
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (job.mentorId !== user.id && user.role !== "admin") {
      return c.json({ error: "Only the assigned mentor can request revisions" }, 403);
    }

    await db.update(milestones).set({ status: "pending" }).where(eq(milestones.id, id));
    await db.insert(jobUpdates).values({
      id: crypto.randomUUID(),
      jobId: job.id,
      authorId: user.id,
      kind: "revision",
      milestoneId: id,
      content: parsed.data.content,
    });

    return c.json({ ok: true });
  });

  return app;
}