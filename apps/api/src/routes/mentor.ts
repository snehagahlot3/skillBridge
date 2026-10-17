import { Hono } from "hono";
import { eq, isNull, inArray, and } from "drizzle-orm";
import { jobs, applications, milestones, jobUpdates, users, teamMembers } from "../db/schema";
import { authMiddleware, requireRole } from "../middleware/auth";
import type { AppEnv } from "../types";

function parsePositions(job: typeof jobs.$inferSelect): { id: string; title: string; count: number }[] {
  try {
    return JSON.parse(job.positions || "[]");
  } catch {
    return [];
  }
}

async function enrichJob(db: AppEnv["Variables"]["db"], job: typeof jobs.$inferSelect) {
  const [owner] = await db.select().from(users).where(eq(users.id, job.ownerId));
  const apps = await db.select().from(applications).where(eq(applications.jobId, job.id));
  const team = await db.select().from(teamMembers).where(eq(teamMembers.jobId, job.id));
  const teamNames = await Promise.all(
    team.map(async (t) => {
      const [u] = await db.select().from(users).where(eq(users.id, t.userId));
      return { userId: t.userId, name: u?.name || "Unknown", positionTitle: t.positionTitle };
    })
  );
  const positions = parsePositions(job).map((p) => ({
    ...p,
    filled: team.filter((t) => t.positionId === p.id).length,
  }));
  return {
    ...job,
    requiredSkills: JSON.parse(job.requiredSkills || "[]"),
    positions,
    ownerName: owner?.name || null,
    teamNames,
    applicationCount: apps.length,
  };
}

export function mentorRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);
  app.use("*", requireRole("mentor", "admin"));

  // Live jobs without a mentor — mentors can claim these themselves
  app.get("/queue", async (c) => {
    const db = c.var.db;
    const rows = await db
      .select()
      .from(jobs)
      .where(and(isNull(jobs.mentorId), inArray(jobs.status, ["open", "awarded", "in_progress"])));

    const enriched = await Promise.all(rows.map((j) => enrichJob(db, j)));
    return c.json(enriched);
  });

  // Claim a job (self-assign)
  app.post("/jobs/:id/claim", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (job.mentorId) return c.json({ error: "Job already has a mentor" }, 400);
    if (!["open", "awarded", "in_progress"].includes(job.status)) {
      return c.json({ error: "Job is not live" }, 400);
    }

    await db.update(jobs).set({ mentorId: user.id }).where(eq(jobs.id, id));
    await db.insert(jobUpdates).values({
      id: crypto.randomUUID(),
      jobId: id,
      authorId: user.id,
      kind: "system",
      content: `${user.name} joined as mentor.`,
    });

    return c.json({ ok: true });
  });

  // Jobs I mentor
  app.get("/jobs", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const rows = await db.select().from(jobs).where(eq(jobs.mentorId, user.id));
    const enriched = await Promise.all(rows.map((j) => enrichJob(db, j)));
    return c.json(enriched);
  });

  // Mentor view of one job: milestones, updates, team, quotes
  app.get("/jobs/:id", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (job.mentorId !== user.id && user.role !== "admin") {
      return c.json({ error: "Forbidden" }, 403);
    }

    const jobMilestones = await db.select().from(milestones).where(eq(milestones.jobId, id));
    const updates = await db.select().from(jobUpdates).where(eq(jobUpdates.jobId, id));
    const enrichedUpdates = await Promise.all(
      updates.map(async (u) => {
        const [author] = u.authorId
          ? await db.select().from(users).where(eq(users.id, u.authorId))
          : [undefined];
        const [milestone] = u.milestoneId
          ? await db.select().from(milestones).where(eq(milestones.id, u.milestoneId))
          : [undefined];
        return {
          ...u,
          authorName: author?.name || "System",
          authorRole: author?.role || "system",
          milestoneTitle: milestone?.title || null,
        };
      })
    );
    const jobApplications = await db
      .select()
      .from(applications)
      .where(eq(applications.jobId, id));

    return c.json({
      ...(await enrichJob(db, job)),
      milestones: jobMilestones,
      updates: enrichedUpdates,
      applications: jobApplications,
    });
  });

  return app;
}