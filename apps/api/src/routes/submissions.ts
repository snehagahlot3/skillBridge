import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { submissions, milestones, projects, users } from "../db/schema";
import { authMiddleware, requireRole } from "../middleware/auth";
import { transitionProjectStatus } from "../lib/stateMachine";
import type { AppEnv, AuthUser } from "../types";

const submitSchema = z.object({
  milestoneId: z.string(),
  notes: z.string().optional(),
  fileUrls: z.array(z.string()).default([]),
});

const uploadUrlSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
});

export function submissionRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);

  app.post("/submit", requireRole("user"), async (c) => {
    const db = c.var.db;
    const user = c.get("user") as AuthUser;
    const body = await c.req.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, parsed.data.milestoneId));
    if (!milestone) return c.json({ error: "Milestone not found" }, 404);

    const [project] = await db.select().from(projects).where(eq(projects.id, milestone.projectId));
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.status !== "assigned" && project.status !== "in_progress" && project.status !== "submitted") {
      return c.json({ error: "Project is not accepting submissions" }, 400);
    }

    const id = crypto.randomUUID();
    await db.insert(submissions).values({
      id,
      milestoneId: parsed.data.milestoneId,
      applicantId: user.id,
      notes: parsed.data.notes,
      fileUrls: JSON.stringify(parsed.data.fileUrls),
    });

    await db.update(milestones).set({ status: "submitted" }).where(eq(milestones.id, parsed.data.milestoneId));

    const allMilestones = await db.select().from(milestones).where(eq(milestones.projectId, project.id));
    if (allMilestones.every((m) => m.status === "submitted" || m.status === "approved")) {
      await transitionProjectStatus(db, project.id, "submitted", user.id);
    } else if (project.status === "assigned") {
      await transitionProjectStatus(db, project.id, "in_progress", user.id);
    }

    return c.json({ id, submittedAt: new Date().toISOString() }, 201);
  });

  app.get("/project/:projectId", async (c) => {
    const db = c.var.db;
    const user = c.get("user") as AuthUser;
    const { projectId } = c.req.param();

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return c.json({ error: "Not found" }, 404);

    const isOwner = project.ownerId === user.id;
    const isMentor = project.mentorId === user.id || user.role === "mentor";
    if (!isOwner && !isMentor) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const allSubs = await db.select().from(submissions);

    const projectMilestones = await db.select().from(milestones).where(eq(milestones.projectId, projectId));
    const milestoneIds = new Set(projectMilestones.map((m) => m.id));

    const relevant = allSubs.filter((s) => milestoneIds.has(s.milestoneId));
    const enriched = await Promise.all(
      relevant.map(async (s) => {
        const [milestone] = await db.select().from(milestones).where(eq(milestones.id, s.milestoneId));
        const [applicant] = await db.select().from(users).where(eq(users.id, s.applicantId));
        return {
          ...s,
          fileUrls: JSON.parse(s.fileUrls || "[]"),
          milestone: milestone ? { title: milestone.title, status: milestone.status } : null,
          applicant: applicant ? { id: applicant.id, name: applicant.name } : null,
        };
      })
    );

    return c.json(enriched);
  });

  app.get("/mine", requireRole("user"), async (c) => {
    const db = c.var.db;
    const user = c.get("user") as AuthUser;

    const mine = await db.select().from(submissions).where(eq(submissions.applicantId, user.id));
    const enriched = await Promise.all(
      mine.map(async (s) => {
        const [milestone] = await db.select().from(milestones).where(eq(milestones.id, s.milestoneId));
        const [project] = milestone
          ? await db.select().from(projects).where(eq(projects.id, milestone.projectId))
          : [undefined];
        return {
          ...s,
          fileUrls: JSON.parse(s.fileUrls || "[]"),
          milestone: milestone ? { title: milestone.title, status: milestone.status } : null,
          project: project ? { id: project.id, title: project.title } : null,
        };
      })
    );

    return c.json(enriched);
  });

  app.post("/upload-url", requireRole("user", "mentor"), async (c) => {
    const body = await c.req.json();
    const parsed = uploadUrlSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const key = `uploads/${crypto.randomUUID()}-${parsed.data.filename}`;
    return c.json({ url: key, key });
  });

  return app;
}
