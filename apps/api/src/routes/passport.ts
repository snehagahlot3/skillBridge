import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { verifiedSkills, profiles, projects, reviews, users } from "../db/schema";
import type { AppEnv } from "../types";

export function passportRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/:slug", async (c) => {
    const db = c.var.db;
    const { slug } = c.req.param();

    const [profile] = await db.select().from(profiles).where(eq(profiles.publicSlug, slug));
    if (!profile) return c.json({ error: "Not found" }, 404);

    if (!profile.passportConsent) {
      return c.json({ error: "This user has not consented to a public passport" }, 403);
    }

    const [user] = await db.select().from(users).where(eq(users.id, profile.userId));
    const skills = await db.select().from(verifiedSkills).where(eq(verifiedSkills.userId, profile.userId));

    const skillsWithEvidence = await Promise.all(
      skills.map(async (s) => {
        const [project] = await db.select().from(projects).where(eq(projects.id, s.projectId));
        const [review] = await db.select().from(reviews).where(eq(reviews.id, s.reviewId));
        const [reviewer] = review
          ? await db.select().from(users).where(eq(users.id, review.reviewerId))
          : [undefined];
        return {
          ...s,
          project: project ? { title: project.title, category: project.category } : null,
          reviewer: reviewer ? { name: reviewer.name } : null,
        };
      })
    );

    return c.json({
      user: {
        id: profile.userId,
        name: user?.name,
        college: profile.college,
        city: profile.city,
        bio: profile.bio,
        linkedin: profile.linkedin,
        github: profile.github,
        portfolio: profile.portfolio,
        skills: JSON.parse(profile.skills || "[]"),
      },
      verifiedSkills: skillsWithEvidence,
    });
  });

  return app;
}
