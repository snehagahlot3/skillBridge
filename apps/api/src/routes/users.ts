import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import {
  users,
  profiles,
  businessProfiles,
  mentorProfiles,
  jobs,
  reviews,
  teamMembers,
} from "../db/schema";
import type { AppEnv } from "../types";

// Public profile: previous jobs, links, reviews — and mentor info for mentors.
export function userRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/:id", async (c) => {
    const db = c.var.db;
    const { id } = c.req.param();

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return c.json({ error: "Not found" }, 404);
    if (user.status === "blocked") return c.json({ error: "Not found" }, 404);

    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, id));
    const [business] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, id));
    const [mentor] = await db.select().from(mentorProfiles).where(eq(mentorProfiles.userId, id));

    // Jobs posted by this user (visible, not delisted)
    const postedJobs = await db
      .select()
      .from(jobs)
      .where(eq(jobs.ownerId, id));
    const visiblePosted = postedJobs.filter((j) => j.status !== "delisted");

    // Jobs this user completed as a hired team member
    const memberships = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, id));
    const completedJobs: typeof jobs.$inferSelect[] = [];
    for (const m of memberships) {
      const [job] = await db.select().from(jobs).where(eq(jobs.id, m.jobId));
      if (job && job.status === "completed") completedJobs.push(job);
    }

    // Jobs mentored
    const mentored = await db.select().from(jobs).where(eq(jobs.mentorId, id));

    const received = await db.select().from(reviews).where(eq(reviews.revieweeId, id));
    const avgRating = received.length
      ? received.reduce((s, r) => s + r.rating, 0) / received.length
      : null;

    const enrichedReviews = await Promise.all(
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

    return c.json({
      user: { id: user.id, name: user.name, role: user.role, createdAt: user.createdAt },
      profile: profile
        ? {
            city: profile.city,
            college: profile.college,
            bio: profile.bio,
            skills: JSON.parse(profile.skills || "[]"),
            linkedin: profile.linkedin,
            github: profile.github,
            portfolio: profile.portfolio,
            resumeKey: profile.resumeKey,
          }
        : null,
      business: business
        ? {
            businessName: business.businessName,
            sector: business.sector,
            city: business.city,
            verificationStatus: business.verificationStatus,
          }
        : null,
      mentor: mentor
        ? {
            expertise: JSON.parse(mentor.expertise || "[]"),
            organization: mentor.organization,
            bio: mentor.bio,
          }
        : null,
      jobsPosted: visiblePosted.map((j) => ({
        id: j.id,
        title: j.title,
        category: j.category,
        status: j.status,
        budgetMin: j.budgetMin,
        budgetMax: j.budgetMax,
      })),
      jobsCompleted: completedJobs.map((j) => ({
        id: j.id,
        title: j.title,
        category: j.category,
        budgetMin: j.budgetMin,
        budgetMax: j.budgetMax,
      })),
      stats: {
        jobsPosted: visiblePosted.length,
        jobsCompleted: completedJobs.length,
        jobsMentored: mentored.length,
        avgRating,
        reviewCount: received.length,
      },
      reviews: enrichedReviews,
    });
  });

  return app;
}