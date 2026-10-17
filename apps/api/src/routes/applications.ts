import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { applications, projects, users, studentProfiles, milestones } from "../db/schema";
import { authMiddleware, requireRole } from "../middleware/auth";
import { transitionProjectStatus } from "../lib/stateMachine";
import type { AppEnv, AuthUser } from "../types";

const applySchema = z.object({
  pitch: z.string().min(20),
});

export function applicationRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);

  app.get("/mine", requireRole("student"), async (c) => {
    const db = c.var.db;
    const user = c.get("user") as AuthUser;

    const mine = await db.select().from(applications).where(eq(applications.studentId, user.id));
    const enriched = await Promise.all(
      mine.map(async (a) => {
        const [project] = await db.select().from(projects).where(eq(projects.id, a.projectId));
        const projectMilestones = project
          ? await db.select().from(milestones).where(eq(milestones.projectId, project.id))
          : [];
        return {
          ...a,
          project: project ? { id: project.id, title: project.title, status: project.status, rubric: project.rubric ? JSON.parse(project.rubric) : null } : null,
          milestones: projectMilestones,
        };
      })
    );

    return c.json(enriched);
  });

  app.post("/:projectId/apply", requireRole("student"), async (c) => {
    const db = c.var.db;
    const user = c.get("user") as AuthUser;
    const { projectId } = c.req.param();
    const body = await c.req.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.status !== "open") return c.json({ error: "Project not open" }, 400);

    const [existing] = await db
      .select()
      .from(applications)
      .where(eq(applications.projectId, projectId));
    const allApps = await db.select().from(applications).where(eq(applications.projectId, projectId));
    if (allApps.some((a) => a.studentId === user.id)) {
      return c.json({ error: "Already applied" }, 409);
    }

    const id = crypto.randomUUID();
    await db.insert(applications).values({
      id,
      projectId,
      studentId: user.id,
      pitch: parsed.data.pitch,
    });

    return c.json({ id, status: "pending" }, 201);
  });

  app.get("/:projectId/applications", async (c) => {
    const db = c.var.db;
    const { projectId } = c.req.param();
    const user = c.get("user") as AuthUser;

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return c.json({ error: "Not found" }, 404);

    const isOwner = project.smeId === user.id;
    const isMentor = project.mentorId === user.id;
    if (!isOwner && !isMentor && user.role !== "admin") {
      return c.json({ error: "Forbidden" }, 403);
    }

    const apps = await db.select().from(applications).where(eq(applications.projectId, projectId));
    const withStudents = await Promise.all(
      apps.map(async (a) => {
        const [student] = await db.select().from(users).where(eq(users.id, a.studentId));
        const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, a.studentId));
        return {
          ...a,
          student: student ? { name: student.name, college: profile?.college, skills: profile ? JSON.parse(profile.skills || "[]") : [] } : null,
        };
      })
    );

    return c.json(withStudents);
  });

  app.post("/:applicationId/accept", requireRole("sme"), async (c) => {
    const db = c.var.db;
    const user = c.get("user") as AuthUser;
    const { applicationId } = c.req.param();

    const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
    if (!application) return c.json({ error: "Not found" }, 404);

    const [project] = await db.select().from(projects).where(eq(projects.id, application.projectId));
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.smeId !== user.id) return c.json({ error: "Forbidden" }, 403);

    await db.update(applications).set({ status: "accepted" }).where(eq(applications.id, applicationId));
    await db.update(applications).set({ status: "rejected" }).where(eq(applications.projectId, project.id));

    const result = await transitionProjectStatus(db, project.id, "assigned", user.id);
    if (!result.ok) return c.json({ error: result.error }, 400);

    return c.json({ ok: true });
  });

  return app;
}
