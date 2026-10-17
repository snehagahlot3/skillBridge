import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, and, ne } from "drizzle-orm";
import {
  applications,
  jobs,
  users,
  profiles,
  milestones,
  jobUpdates,
  reviews,
  teamMembers,
} from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { transitionJobStatus } from "../lib/stateMachine";
import type { AppEnv } from "../types";

const applySchema = z.object({
  positionId: z.string().min(1),
  pitch: z.string().min(10),
  quoteAmount: z.number().nonnegative(),
});

function parsePositions(job: typeof jobs.$inferSelect): { id: string; title: string; count: number }[] {
  try {
    return JSON.parse(job.positions || "[]");
  } catch {
    return [];
  }
}

async function applicantProfile(db: AppEnv["Variables"]["db"], applicantId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, applicantId));
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, applicantId));
  const received = await db.select().from(reviews).where(eq(reviews.revieweeId, applicantId));
  const avgRating = received.length
    ? received.reduce((s, r) => s + r.rating, 0) / received.length
    : null;

  return {
    id: applicantId,
    name: user?.name || "Unknown",
    email: user?.email || "",
    college: profile?.college || null,
    city: profile?.city || null,
    skills: profile ? JSON.parse(profile.skills || "[]") : [],
    linkedin: profile?.linkedin || null,
    github: profile?.github || null,
    portfolio: profile?.portfolio || null,
    resumeKey: profile?.resumeKey || null,
    slug: profile?.publicSlug || null,
    avgRating,
    reviewCount: received.length,
  };
}

export function applicationRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);

  // My applications (as an applicant) + whether I'm on the hired team
  app.get("/mine", async (c) => {
    const db = c.var.db;
    const user = c.get("user");

    const mine = await db.select().from(applications).where(eq(applications.applicantId, user.id));
    const enriched = await Promise.all(
      mine.map(async (a) => {
        const [job] = await db.select().from(jobs).where(eq(jobs.id, a.jobId));
        const jobMilestones = job
          ? await db.select().from(milestones).where(eq(milestones.jobId, job.id))
          : [];
        const [membership] = await db
          .select()
          .from(teamMembers)
          .where(and(eq(teamMembers.jobId, a.jobId), eq(teamMembers.userId, user.id)));
        const positions = job ? parsePositions(job) : [];
        return {
          ...a,
          positionTitle: positions.find((p) => p.id === a.positionId)?.title || null,
          job: job
            ? {
                id: job.id,
                title: job.title,
                status: job.status,
                budgetMin: job.budgetMin,
                budgetMax: job.budgetMax,
                mentorId: job.mentorId,
              }
            : null,
          milestones: jobMilestones,
          onTeam: !!membership,
        };
      })
    );

    return c.json(enriched);
  });

  // Submit a quote for a specific position
  app.post("/:jobId/apply", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { jobId } = c.req.param();
    const body = await c.req.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (job.ownerId === user.id) return c.json({ error: "You cannot apply to your own job" }, 400);
    if (job.status !== "open") return c.json({ error: "Job is not open for quotes" }, 400);

    const positions = parsePositions(job);
    const position = positions.find((p) => p.id === parsed.data.positionId);
    if (!position) return c.json({ error: "Position not found on this job" }, 400);

    const hired = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.jobId, jobId), eq(teamMembers.positionId, position.id)));
    if (hired.length >= position.count) {
      return c.json({ error: "This position is already filled" }, 400);
    }

    const existing = await db
      .select()
      .from(applications)
      .where(and(eq(applications.jobId, jobId), eq(applications.applicantId, user.id)));
    if (existing.some((a) => a.positionId === parsed.data.positionId)) {
      return c.json({ error: "You already submitted a quote for this position" }, 409);
    }

    const id = crypto.randomUUID();
    await db.insert(applications).values({
      id,
      jobId,
      applicantId: user.id,
      positionId: parsed.data.positionId,
      pitch: parsed.data.pitch,
      quoteAmount: parsed.data.quoteAmount,
    });

    return c.json({ id, status: "pending" }, 201);
  });

  // List quotes for a job (owner, mentor, admin)
  app.get("/:jobId/applications", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { jobId } = c.req.param();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job) return c.json({ error: "Not found" }, 404);

    const allowed =
      job.ownerId === user.id || job.mentorId === user.id || user.role === "admin";
    if (!allowed) return c.json({ error: "Forbidden" }, 403);

    const apps = await db
      .select()
      .from(applications)
      .where(eq(applications.jobId, jobId))
      .orderBy(desc(applications.createdAt));

    const positions = parsePositions(job);
    const team = await db.select().from(teamMembers).where(eq(teamMembers.jobId, jobId));

    const withApplicants = await Promise.all(
      apps.map(async (a) => ({
        ...a,
        positionTitle: positions.find((p) => p.id === a.positionId)?.title || null,
        applicant: await applicantProfile(db, a.applicantId),
      }))
    );

    return c.json({ applications: withApplicants, team });
  });

  // Owner awards the job to an applicant for a position.
  // When every position is filled, the job automatically becomes "awarded"
  // (and therefore disappears from the open portal).
  app.post("/:applicationId/accept", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { applicationId } = c.req.param();

    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId));
    if (!application) return c.json({ error: "Not found" }, 404);
    if (application.status !== "pending") return c.json({ error: "Application already decided" }, 400);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, application.jobId));
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (job.ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);
    if (job.status !== "open") return c.json({ error: "Job is not open" }, 400);

    const positions = parsePositions(job);
    const position = positions.find((p) => p.id === application.positionId);
    if (!position) return c.json({ error: "Position no longer exists" }, 400);

    const hiredForPosition = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.jobId, job.id), eq(teamMembers.positionId, position.id)));
    if (hiredForPosition.length >= position.count) {
      return c.json({ error: "This position is already filled" }, 400);
    }

    // Accept this application + add to team
    await db
      .update(applications)
      .set({ status: "accepted" })
      .where(eq(applications.id, applicationId));
    await db.insert(teamMembers).values({
      id: crypto.randomUUID(),
      jobId: job.id,
      userId: application.applicantId,
      positionId: position.id,
      positionTitle: position.title,
    });

    const [applicant] = await db
      .select()
      .from(users)
      .where(eq(users.id, application.applicantId));

    await db.insert(jobUpdates).values({
      id: crypto.randomUUID(),
      jobId: job.id,
      authorId: user.id,
      kind: "system",
      content: `${applicant?.name || "A user"} joined as ${position.title}. Quote: ₹${application.quoteAmount ?? 0}`,
    });

    // If this position is now full, reject remaining pending quotes for it
    const teamAfter = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.jobId, job.id), eq(teamMembers.positionId, position.id)));
    if (teamAfter.length >= position.count) {
      const remaining = await db
        .select()
        .from(applications)
        .where(and(eq(applications.jobId, job.id), eq(applications.positionId, position.id)));
      for (const a of remaining) {
        if (a.id !== applicationId && a.status === "pending") {
          await db.update(applications).set({ status: "rejected" }).where(eq(applications.id, a.id));
        }
      }
    }

    // All positions filled -> team complete -> awarded
    const fullTeam = await db.select().from(teamMembers).where(eq(teamMembers.jobId, job.id));
    const allFilled = positions.every(
      (p) => fullTeam.filter((t) => t.positionId === p.id).length >= p.count
    );
    if (allFilled) {
      const result = await transitionJobStatus(db, job.id, "awarded", user.id);
      if (!result.ok) return c.json({ error: result.error }, 400);
      await db.insert(jobUpdates).values({
        id: crypto.randomUUID(),
        jobId: job.id,
        authorId: user.id,
        kind: "system",
        content: "Team complete! The job has been awarded and the chat is open for everyone.",
      });
    }

    return c.json({ ok: true, teamComplete: allFilled });
  });

  return app;
}