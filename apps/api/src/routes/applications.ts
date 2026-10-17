import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { applications, projects, users, profiles, milestones } from "../db/schema";
import { authMiddleware, requireRole } from "../middleware/auth";
import { transitionProjectStatus } from "../lib/stateMachine";
import type { AppEnv, AuthUser } from "../types";

const applySchema = z.object({
  pitch: z.string().min(20),
});

export function applicationRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);

  app.get("/mine", requireRole("user"), async (c) => {
    const db = c.var.db;
    const user = c.get("user") as AuthUser;

    const mine = await db.select().from(applications).where(eq(applications.applicantId, user.id));
    const enriched = await Promise.all(
      mine.map(async (a) => {
        const [project] = await db.select().from(projects).where(eq(projects.id, a.projectId));
        const projectMilestones = project
          ? await db.select().from(milestones).where(eq(milestones.projectId, project.id))
          : [];
        return {
          ...a,
          project: project
            ? {
                id: project.id,
                title: project.title,
                status: project.status,
                rubric: project.rubric ? JSON.parse(project.rubric) : null,
              }
            : null,
          milestones: projectMilestones,
        };
      })
    );

    return c.json(enriched);
  });

  app.post("/:projectId/apply", requireRole("user"), async (c) => {
    const db = c.var.db;
    const user = c.get("user") as AuthUser;
    const { projectId } = c.req.param();
    const body = await c.req.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.status !== "open") return c.json({ error: "Project not open" }, 400);
    if (project.ownerId === user.id) return c.json({ error: "You cannot apply to your own project" }, 400);

    const allApps = await db.select().from(applications).where(eq(applications.projectId, projectId));
    if (allApps.some((a) => a.applicantId === user.id)) {
      return c.json({ error: "Already applied" }, 409);
    }

    const id = crypto.randomUUID();
    await db.insert(applications).values({
      id,
      projectId,
      applicantId: user.id,
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

    const isOwner = project.ownerId === user.id;
    const isMentor = project.mentorId === user.id || user.role === "mentor";
    if (!isOwner && !isMentor) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const apps = await db.select().from(applications).where(eq(applications.projectId, projectId));
    const withApplicants = await Promise.all(
      apps.map(async (a) => {
        const [applicant] = await db.select().from(users).where(eq(users.id, a.applicantId));
        const [profile] = await db.select().from(profiles).where(eq(profiles.userId, a.applicantId));
        return {
          ...a,
          applicant: applicant
            ? {
                id: applicant.id,
                name: applicant.name,
                email: applicant.email,
                college: profile?.college ?? null,
                skills: profile ? JSON.parse(profile.skills || "[]") : [],
                linkedin: profile?.linkedin ?? null,
                github: profile?.github ?? null,
                portfolio: profile?.portfolio ?? null,
                resumeKey: profile?.resumeKey ?? null,
              }
            : null,
        };
      })
    );

    return c.json(withApplicants);
  });

  app.post("/:applicationId/accept", requireRole("user"), async (c) => {
    const db = c.var.db;
    const user = c.get("user") as AuthUser;
    const { applicationId } = c.req.param();

    const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
    if (!application) return c.json({ error: "Not found" }, 404);

    const [project] = await db.select().from(projects).where(eq(projects.id, application.projectId));
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);

    await db.update(applications).set({ status: "rejected" }).where(eq(applications.projectId, project.id));
    await db.update(applications).set({ status: "accepted" }).where(eq(applications.id, applicationId));

    const result = await transitionProjectStatus(db, project.id, "assigned", user.id);
    if (!result.ok) return c.json({ error: result.error }, 400);

    return c.json({ ok: true });
  });

  return app;
}
