import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users, smeProfiles, mentorProfiles, projects, auditLog } from "../db/schema";
import { authMiddleware, requireRole } from "../middleware/auth";
import type { AppEnv } from "../types";

export function adminRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);
  app.use("*", requireRole("admin"));

  app.get("/smes", async (c) => {
    const db = c.var.db;
    const profiles = await db.select().from(smeProfiles);
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const [user] = await db.select().from(users).where(eq(users.id, p.userId));
        return { ...p, name: user?.name, email: user?.email };
      })
    );
    return c.json(enriched);
  });

  app.patch("/smes/:userId/verify", async (c) => {
    const db = c.var.db;
    const actor = c.get("user");
    const { userId } = c.req.param();

    await db.update(smeProfiles).set({ verificationStatus: "verified" }).where(eq(smeProfiles.userId, userId));
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId: actor.id,
      action: "sme_verified",
      entity: "sme_profile",
      entityId: userId,
    });

    return c.json({ ok: true });
  });

  app.get("/mentors", async (c) => {
    const db = c.var.db;
    const profiles = await db.select().from(mentorProfiles);
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const [user] = await db.select().from(users).where(eq(users.id, p.userId));
        return { ...p, name: user?.name, email: user?.email, expertise: JSON.parse(p.expertise || "[]") };
      })
    );
    return c.json(enriched);
  });

  app.get("/projects", async (c) => {
    const db = c.var.db;
    const all = await db.select().from(projects);
    const enriched = await Promise.all(
      all.map(async (p) => {
        const [sme] = await db.select().from(users).where(eq(users.id, p.smeId));
        const [mentor] = p.mentorId
          ? await db.select().from(users).where(eq(users.id, p.mentorId))
          : [undefined];
        return {
          ...p,
          requiredSkills: JSON.parse(p.requiredSkills || "[]"),
          sme: sme ? { name: sme.name } : null,
          mentor: mentor ? { id: mentor.id, name: mentor.name } : null,
        };
      })
    );
    return c.json(enriched);
  });

  const assignSchema = z.object({ mentorId: z.string() });

  app.patch("/projects/:id/assign-mentor", async (c) => {
    const db = c.var.db;
    const actor = c.get("user");
    const { id } = c.req.param();
    const body = await c.req.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    await db.update(projects).set({ mentorId: parsed.data.mentorId }).where(eq(projects.id, id));
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId: actor.id,
      action: "mentor_assigned",
      entity: "project",
      entityId: id,
      details: JSON.stringify({ mentorId: parsed.data.mentorId }),
    });

    return c.json({ ok: true });
  });

  return app;
}
