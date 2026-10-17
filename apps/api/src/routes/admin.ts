import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users, profiles, businessProfiles, mentorProfiles, projects, auditLog } from "../db/schema";
import { authMiddleware, requireRole } from "../middleware/auth";
import type { AppEnv } from "../types";

export function adminRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);
  app.use("*", requireRole("mentor"));

  app.get("/businesses", async (c) => {
    const db = c.var.db;
    const profilesList = await db.select().from(businessProfiles);
    const enriched = await Promise.all(
      profilesList.map(async (p) => {
        const [user] = await db.select().from(users).where(eq(users.id, p.userId));
        return { ...p, name: user?.name, email: user?.email };
      })
    );
    return c.json(enriched);
  });

  app.patch("/businesses/:userId/verify", async (c) => {
    const db = c.var.db;
    const actor = c.get("user");
    const { userId } = c.req.param();

    await db
      .update(businessProfiles)
      .set({ verificationStatus: "verified" })
      .where(eq(businessProfiles.userId, userId));
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId: actor.id,
      action: "business_verified",
      entity: "business_profile",
      entityId: userId,
    });

    return c.json({ ok: true });
  });

  app.get("/mentors", async (c) => {
    const db = c.var.db;
    const profilesList = await db.select().from(mentorProfiles);
    const enriched = await Promise.all(
      profilesList.map(async (p) => {
        const [user] = await db.select().from(users).where(eq(users.id, p.userId));
        return { ...p, name: user?.name, email: user?.email, expertise: JSON.parse(p.expertise || "[]") };
      })
    );
    return c.json(enriched);
  });

  app.get("/users", async (c) => {
    const db = c.var.db;
    const all = await db.select().from(users);
    const enriched = await Promise.all(
      all.map(async (u) => {
        const [profile] = await db.select().from(profiles).where(eq(profiles.userId, u.id));
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          college: profile?.college ?? null,
          skills: profile ? JSON.parse(profile.skills || "[]") : [],
          resumeKey: profile?.resumeKey ?? null,
        };
      })
    );
    return c.json(enriched);
  });

  app.get("/projects", async (c) => {
    const db = c.var.db;
    const all = await db.select().from(projects);
    const enriched = await Promise.all(
      all.map(async (p) => {
        const [owner] = await db.select().from(users).where(eq(users.id, p.ownerId));
        const [business] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, p.ownerId));
        const [mentor] = p.mentorId
          ? await db.select().from(users).where(eq(users.id, p.mentorId))
          : [undefined];
        return {
          ...p,
          requiredSkills: JSON.parse(p.requiredSkills || "[]"),
          owner: owner ? { id: owner.id, name: owner.name, businessName: business?.businessName ?? null } : null,
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
