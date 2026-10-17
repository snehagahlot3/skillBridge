import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { projects, applications, milestones, users, smeProfiles } from "../db/schema";
import { authMiddleware, requireRole } from "../middleware/auth";
import { transitionProjectStatus, type ProjectStatus } from "../lib/stateMachine";
import type { AppEnv, AuthUser } from "../types";

const projectSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string(),
  requiredSkills: z.array(z.string()),
  budgetType: z.enum(["paid", "stipend", "unpaid"]),
  budgetAmount: z.number().optional(),
  deadline: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  rubric: z
    .array(
      z.object({
        criterion: z.string(),
        description: z.string(),
        maxScore: z.number().default(4),
      })
    )
    .optional(),
});

export function projectRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);

  app.post("/", requireRole("sme"), async (c) => {
    const db = c.var.db;
    const user = c.get("user") as AuthUser;
    const body = await c.req.json();
    const parsed = projectSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const id = crypto.randomUUID();
    await db.insert(projects).values({
      id,
      smeId: user.id,
      ...parsed.data,
      requiredSkills: JSON.stringify(parsed.data.requiredSkills),
      rubric: parsed.data.rubric ? JSON.stringify(parsed.data.rubric) : null,
      acceptanceCriteria: parsed.data.acceptanceCriteria,
    });

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return c.json(project, 201);
  });

  app.get("/", async (c) => {
    const db = c.var.db;
    const user = c.get("user") as AuthUser;
    const { skill, category, status, mine } = c.req.query();

    const conditions = [];
    if (status) conditions.push(eq(projects.status, status as ProjectStatus));
    if (category) conditions.push(eq(projects.category, category));
    if (mine === "1") conditions.push(eq(projects.smeId, user.id));

    const baseQuery = db.select().from(projects);
    const allProjects = await (conditions.length > 0
      ? baseQuery.where(and(...conditions))
      : baseQuery
    ).orderBy(desc(projects.createdAt));

    let filtered = allProjects;
    if (skill) {
      filtered = allProjects.filter((p) => {
        const skills: string[] = JSON.parse(p.requiredSkills || "[]");
        return skills.some((s) => s.toLowerCase().includes(skill.toLowerCase()));
      });
    }

    const withSme = await Promise.all(
      filtered.map(async (p) => {
        const [sme] = await db.select().from(users).where(eq(users.id, p.smeId));
        const [smeProfile] = await db.select().from(smeProfiles).where(eq(smeProfiles.userId, p.smeId));
        return {
          ...p,
          requiredSkills: JSON.parse(p.requiredSkills || "[]"),
          rubric: p.rubric ? JSON.parse(p.rubric) : null,
          sme: sme ? { name: sme.name, businessName: smeProfile?.businessName, verificationStatus: smeProfile?.verificationStatus } : null,
        };
      })
    );

    return c.json(withSme);
  });

  app.get("/:id", async (c) => {
    const db = c.var.db;
    const { id } = c.req.param();
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return c.json({ error: "Not found" }, 404);

    const [sme] = await db.select().from(users).where(eq(users.id, project.smeId));
    const [smeProfile] = await db.select().from(smeProfiles).where(eq(smeProfiles.userId, project.smeId));
    const projectMilestones = await db.select().from(milestones).where(eq(milestones.projectId, id));
    const projectApplications = await db.select().from(applications).where(eq(applications.projectId, id));

    return c.json({
      ...project,
      requiredSkills: JSON.parse(project.requiredSkills || "[]"),
      rubric: project.rubric ? JSON.parse(project.rubric) : null,
      sme: sme ? { name: sme.name, businessName: smeProfile?.businessName, verificationStatus: smeProfile?.verificationStatus } : null,
      milestones: projectMilestones,
      applications: projectApplications,
    });
  });

  app.patch("/:id/publish", requireRole("sme"), async (c) => {
    const db = c.var.db;
    const user = c.get("user") as AuthUser;
    const { id } = c.req.param();

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return c.json({ error: "Not found" }, 404);
    if (project.smeId !== user.id) return c.json({ error: "Forbidden" }, 403);

    const result = await transitionProjectStatus(db, id, "open", user.id);
    if (!result.ok) return c.json({ error: result.error }, 400);

    return c.json({ ok: true });
  });

  return app;
}
