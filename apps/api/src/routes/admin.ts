import { Hono } from "hono";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import {
  users,
  profiles,
  businessProfiles,
  mentorProfiles,
  jobs,
  reviews,
  teamMembers,
  auditLog,
} from "../db/schema";
import { authMiddleware, requireRole } from "../middleware/auth";
import { hashPassword } from "../lib/crypto";
import { transitionJobStatus } from "../lib/stateMachine";
import type { AppEnv } from "../types";

const createMentorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  expertise: z.array(z.string()).default([]),
  organization: z.string().optional(),
  bio: z.string().optional(),
});

export function adminRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);
  app.use("*", requireRole("admin"));

  // Overview stats
  app.get("/stats", async (c) => {
    const db = c.var.db;
    const allUsers = await db.select().from(users);
    const allJobs = await db.select().from(jobs);
    const allReviews = await db.select().from(reviews);

    const byStatus: Record<string, number> = {};
    for (const j of allJobs) byStatus[j.status] = (byStatus[j.status] || 0) + 1;

    return c.json({
      users: allUsers.filter((u) => u.role === "user").length,
      mentors: allUsers.filter((u) => u.role === "mentor").length,
      blocked: allUsers.filter((u) => u.status === "blocked").length,
      jobs: allJobs.length,
      jobsByStatus: byStatus,
      reviews: allReviews.length,
    });
  });

  // Create mentor accounts (no public signup for mentors)
  app.post("/mentors", async (c) => {
    const db = c.var.db;
    const actor = c.get("user");
    const body = await c.req.json();
    const parsed = createMentorSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [existing] = await db.select().from(users).where(eq(users.email, parsed.data.email));
    if (existing) return c.json({ error: "Email already registered" }, 409);

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(parsed.data.password);
    await db.insert(users).values({
      id,
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
      role: "mentor",
    });
    await db.insert(mentorProfiles).values({
      userId: id,
      expertise: JSON.stringify(parsed.data.expertise),
      organization: parsed.data.organization,
      bio: parsed.data.bio,
    });
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId: actor.id,
      action: "mentor_created",
      entity: "user",
      entityId: id,
      details: JSON.stringify({ email: parsed.data.email }),
    });

    return c.json({ ok: true, id }, 201);
  });

  app.get("/mentors", async (c) => {
    const db = c.var.db;
    const mentors = await db
      .select()
      .from(users)
      .where(eq(users.role, "mentor"))
      .orderBy(desc(users.createdAt));
    const enriched = await Promise.all(
      mentors.map(async (m) => {
        const [profile] = await db
          .select()
          .from(mentorProfiles)
          .where(eq(mentorProfiles.userId, m.id));
        return {
          id: m.id,
          name: m.name,
          email: m.email,
          status: m.status,
          expertise: profile ? JSON.parse(profile.expertise || "[]") : [],
          organization: profile?.organization || null,
          bio: profile?.bio || null,
        };
      })
    );
    return c.json(enriched);
  });

  app.patch("/mentors/:userId/block", async (c) => {
    const db = c.var.db;
    const actor = c.get("user");
    const { userId } = c.req.param();
    await db.update(users).set({ status: "blocked" }).where(eq(users.id, userId));
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId: actor.id,
      action: "mentor_blocked",
      entity: "user",
      entityId: userId,
    });
    return c.json({ ok: true });
  });

  app.patch("/mentors/:userId/unblock", async (c) => {
    const db = c.var.db;
    const actor = c.get("user");
    const { userId } = c.req.param();
    await db.update(users).set({ status: "active" }).where(eq(users.id, userId));
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId: actor.id,
      action: "mentor_unblocked",
      entity: "user",
      entityId: userId,
    });
    return c.json({ ok: true });
  });

  // Users
  app.get("/users", async (c) => {
    const db = c.var.db;
    const rows = await db.select().from(users).where(eq(users.role, "user"));
    const enriched = await Promise.all(
      rows.map(async (u) => {
        const [profile] = await db.select().from(profiles).where(eq(profiles.userId, u.id));
        const [business] = await db
          .select()
          .from(businessProfiles)
          .where(eq(businessProfiles.userId, u.id));
        const received = await db.select().from(reviews).where(eq(reviews.revieweeId, u.id));
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          status: u.status,
          college: profile?.college || null,
          skills: profile ? JSON.parse(profile.skills || "[]") : [],
          resumeKey: profile?.resumeKey || null,
          businessName: business?.businessName || null,
          reviewCount: received.length,
        };
      })
    );
    return c.json(enriched);
  });

  app.patch("/users/:userId/block", async (c) => {
    const db = c.var.db;
    const actor = c.get("user");
    const { userId } = c.req.param();
    await db.update(users).set({ status: "blocked" }).where(eq(users.id, userId));
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId: actor.id,
      action: "user_blocked",
      entity: "user",
      entityId: userId,
    });
    return c.json({ ok: true });
  });

  app.patch("/users/:userId/unblock", async (c) => {
    const db = c.var.db;
    const actor = c.get("user");
    const { userId } = c.req.param();
    await db.update(users).set({ status: "active" }).where(eq(users.id, userId));
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId: actor.id,
      action: "user_unblocked",
      entity: "user",
      entityId: userId,
    });
    return c.json({ ok: true });
  });

  // Businesses + verification
  app.get("/businesses", async (c) => {
    const db = c.var.db;
    const rows = await db.select().from(businessProfiles);
    const enriched = await Promise.all(
      rows.map(async (b) => {
        const [user] = await db.select().from(users).where(eq(users.id, b.userId));
        return { ...b, name: user?.name || null, email: user?.email || null, status: user?.status || null };
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

  // Jobs overview + delist/relist
  app.get("/jobs", async (c) => {
    const db = c.var.db;
    const rows = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
    const enriched = await Promise.all(
      rows.map(async (j) => {
        const [owner] = await db.select().from(users).where(eq(users.id, j.ownerId));
        const [mentor] = j.mentorId
          ? await db.select().from(users).where(eq(users.id, j.mentorId))
          : [undefined];
        const team = await db.select().from(teamMembers).where(eq(teamMembers.jobId, j.id));
        return {
          ...j,
          requiredSkills: JSON.parse(j.requiredSkills || "[]"),
          positions: JSON.parse(j.positions || "[]"),
          owner: owner ? { id: owner.id, name: owner.name } : null,
          mentor: mentor ? { id: mentor.id, name: mentor.name } : null,
          teamSize: team.length,
        };
      })
    );
    return c.json(enriched);
  });

  app.patch("/jobs/:id/delist", async (c) => {
    const db = c.var.db;
    const actor = c.get("user");
    const { id } = c.req.param();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Job not found" }, 404);

    await db.update(jobs).set({ status: "delisted" }).where(eq(jobs.id, id));
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId: actor.id,
      action: "job_delisted",
      entity: "job",
      entityId: id,
    });
    return c.json({ ok: true });
  });

  app.patch("/jobs/:id/relist", async (c) => {
    const db = c.var.db;
    const actor = c.get("user");
    const { id } = c.req.param();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Job not found" }, 404);

    const result = await transitionJobStatus(db, id, "open", actor.id);
    if (!result.ok) return c.json({ error: result.error }, 400);
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId: actor.id,
      action: "job_relisted",
      entity: "job",
      entityId: id,
    });
    return c.json({ ok: true });
  });

  return app;
}