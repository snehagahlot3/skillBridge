import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { verifiedSkills, studentProfiles, projects, reviews, users } from "../db/schema";
import type { AppEnv } from "../types";

export function passportRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/students/:slug/passport", async (c) => {
    const db = c.var.db;
    const { slug } = c.req.param();

    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.publicSlug, slug));
    if (!profile) return c.json({ error: "Not found" }, 404);

    if (!profile.passportConsent) {
      return c.json({ error: "Student has not consented to public passport" }, 403);
    }

    const [student] = await db.select().from(users).where(eq(users.id, profile.userId));
    const skills = await db.select().from(verifiedSkills).where(eq(verifiedSkills.studentId, profile.userId));

    const skillsWithEvidence = await Promise.all(
      skills.map(async (s) => {
        const [project] = await db.select().from(projects).where(eq(projects.id, s.projectId));
        const [review] = await db.select().from(reviews).where(eq(reviews.id, s.reviewId));
        const [reviewer] = await db.select().from(users).where(eq(users.id, review?.reviewerId || ""));
        return {
          ...s,
          project: project ? { title: project.title, category: project.category } : null,
          reviewer: reviewer ? { name: reviewer.name } : null,
        };
      })
    );

    return c.json({
      student: {
        name: student?.name,
        college: profile.college,
        bio: profile.bio,
      },
      verifiedSkills: skillsWithEvidence,
    });
  });

  return app;
}
