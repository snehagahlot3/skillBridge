import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { reviews, jobs, users, teamMembers } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";

const reviewSchema = z.object({
  revieweeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

async function onTeam(db: AppEnv["Variables"]["db"], jobId: string, userId: string) {
  const rows = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.jobId, jobId), eq(teamMembers.userId, userId)));
  return rows.length > 0;
}

export function reviewRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);

  // Leave a review on a completed job.
  // Owner reviews each team member; each team member reviews the owner.
  app.post("/jobs/:jobId/review", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { jobId } = c.req.param();
    const body = await c.req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (job.status !== "completed") {
      return c.json({ error: "Reviews can only be left after the job is completed" }, 400);
    }

    const reviewerIsOwner = job.ownerId === user.id;
    const reviewerOnTeam = await onTeam(db, jobId, user.id);
    if (!reviewerIsOwner && !reviewerOnTeam) {
      return c.json({ error: "Only the owner and hired team members can review this job" }, 403);
    }

    const revieweeId = parsed.data.revieweeId;
    if (revieweeId === user.id) return c.json({ error: "You cannot review yourself" }, 400);

    if (reviewerIsOwner) {
      // owner -> must be a team member
      const valid = await onTeam(db, jobId, revieweeId);
      if (!valid) return c.json({ error: "The reviewee must be a member of the hired team" }, 400);
    } else {
      // team member -> must be the owner
      if (revieweeId !== job.ownerId) {
        return c.json({ error: "Team members can only review the job owner" }, 400);
      }
    }

    const existing = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.jobId, jobId),
          eq(reviews.reviewerId, user.id),
          eq(reviews.revieweeId, revieweeId)
        )
      );
    if (existing.length) return c.json({ error: "You already reviewed this person for this job" }, 409);

    const id = crypto.randomUUID();
    await db.insert(reviews).values({
      id,
      jobId,
      reviewerId: user.id,
      revieweeId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });

    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return c.json(review, 201);
  });

  // Public: reviews received by a user
  app.get("/users/:userId/reviews", async (c) => {
    const db = c.var.db;
    const { userId } = c.req.param();

    const received = await db
      .select()
      .from(reviews)
      .where(eq(reviews.revieweeId, userId))
      .orderBy(desc(reviews.createdAt));

    const enriched = await Promise.all(
      received.map(async (r) => {
        const [reviewer] = await db.select().from(users).where(eq(users.id, r.reviewerId));
        const [job] = await db.select().from(jobs).where(eq(jobs.id, r.jobId));
        return {
          ...r,
          reviewerName: reviewer?.name || "Unknown",
          jobTitle: job?.title || null,
        };
      })
    );

    return c.json(enriched);
  });

  return app;
}