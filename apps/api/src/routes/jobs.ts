import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, ne, inArray, notInArray } from "drizzle-orm";
import {
  jobs,
  applications,
  milestones,
  users,
  profiles,
  businessProfiles,
  jobUpdates,
  reviews,
  teamMembers,
  aiRepos,
  reviewRuns,
} from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { transitionJobStatus, type JobStatus } from "../lib/stateMachine";
import { notifyJobParticipants, sendEmailTo } from "../lib/email";
import type { AppEnv, AuthUser } from "../types";

const createJobSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().min(1),
  requiredSkills: z.array(z.string()).default([]),
  positions: z
    .array(z.object({ title: z.string().min(1), count: z.number().int().min(1).max(20) }))
    .optional(),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  deadline: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  attachments: z
    .array(z.object({ key: z.string().min(1), name: z.string().min(1) }))
    .max(20)
    .optional(),
  milestones: z
    .array(z.object({ title: z.string().min(1), dueDate: z.string().optional() }))
    .optional(),
});

const addMilestonesSchema = z.object({
  milestones: z.array(z.object({ title: z.string().min(1), dueDate: z.string().optional() })).min(1),
});

const updateSchema = z.object({ content: z.string().min(1) });

const deliverSchema = z.object({
  content: z.string().min(1),
  fileKeys: z.array(z.string().min(1)).max(20).optional(),
});

type JobRow = typeof jobs.$inferSelect;

function parsePositions(job: JobRow): { id: string; title: string; count: number }[] {
  try {
    return JSON.parse(job.positions || "[]");
  } catch {
    return [];
  }
}

async function getTeam(db: AppEnv["Variables"]["db"], jobId: string) {
  const rows = await db.select().from(teamMembers).where(eq(teamMembers.jobId, jobId));
  const enriched = await Promise.all(
    rows.map(async (m) => {
      const [u] = await db.select().from(users).where(eq(users.id, m.userId));
      return { ...m, name: u?.name || "Unknown", email: u?.email || "" };
    })
  );
  return enriched;
}

async function isTeamMember(db: AppEnv["Variables"]["db"], jobId: string, userId: string) {
  const rows = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.jobId, jobId), eq(teamMembers.userId, userId)));
  return rows.length > 0;
}

async function jobWithDetails(db: AppEnv["Variables"]["db"], job: JobRow) {
  const [owner] = await db.select().from(users).where(eq(users.id, job.ownerId));
  const [ownerProfile] = await db.select().from(profiles).where(eq(profiles.userId, job.ownerId));
  const [business] = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, job.ownerId));
  const [mentor] = job.mentorId
    ? await db.select().from(users).where(eq(users.id, job.mentorId))
    : [undefined];

  return {
    ...job,
    requiredSkills: JSON.parse(job.requiredSkills || "[]"),
    positions: parsePositions(job),
    attachments: job.attachments ? JSON.parse(job.attachments) : [],
    owner: owner
      ? {
          id: owner.id,
          name: owner.name,
          businessName: business?.businessName ?? null,
          verificationStatus: business?.verificationStatus ?? "unverified",
          slug: ownerProfile?.publicSlug ?? null,
        }
      : null,
    mentor: mentor ? { id: mentor.id, name: mentor.name } : null,
  };
}

async function logUpdate(
  db: AppEnv["Variables"]["db"],
  jobId: string,
  authorId: string,
  kind: typeof jobUpdates.$inferInsert.kind,
  content: string,
  milestoneId?: string
) {
  await db.insert(jobUpdates).values({
    id: crypto.randomUUID(),
    jobId,
    authorId,
    kind,
    milestoneId,
    content,
  });
}

const editJobSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  category: z.string().min(1).optional(),
  requiredSkills: z.array(z.string()).optional(),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  deadline: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
});

export function jobRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);

  // Create job (any user; drafts until published)
  app.post("/", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const body = await c.req.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    // Business profile gate: users post jobs only after completing it
    const [business] = await db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, user.id));
    if (!business || !business.businessName || !business.city) {
      return c.json(
        { error: "Complete your business profile (business name and city) before posting jobs — Profile tab → Business details." },
        400
      );
    }

    const id = crypto.randomUUID();
    // Positions are optional: a job posted without positions is a simple
    // single-freelancer job — owner picks ONE applicant.
    const rawPositions = parsed.data.positions?.length
      ? parsed.data.positions
      : [{ title: "Freelancer", count: 1 }];
    const positions = rawPositions.map((p) => ({
      id: crypto.randomUUID(),
      title: p.title,
      count: p.count,
    }));

    await db.insert(jobs).values({
      id,
      ownerId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      requiredSkills: JSON.stringify(parsed.data.requiredSkills),
      positions: JSON.stringify(positions),
      budgetMin: parsed.data.budgetMin,
      budgetMax: parsed.data.budgetMax,
      deadline: parsed.data.deadline,
      acceptanceCriteria: parsed.data.acceptanceCriteria,
      attachments: parsed.data.attachments?.length
        ? JSON.stringify(parsed.data.attachments)
        : null,
    });

    if (parsed.data.milestones?.length) {
      await db.insert(milestones).values(
        parsed.data.milestones.map((m, i) => ({
          id: crypto.randomUUID(),
          jobId: id,
          title: m.title,
          dueDate: m.dueDate,
          order: i + 1,
        }))
      );
    }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return c.json(await jobWithDetails(db, job), 201);
  });

  // List jobs. Browsing the portal without filters shows ONLY open jobs —
  // once a team is hired the job is effectively delisted from the portal.
  // The viewer's own jobs and jobs they are already hired on are excluded
  // from the general feed (they live in My Jobs / My Work).
  app.get("/", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { skill, category, status, mine } = c.req.query();

    const myTeam = await db.select().from(teamMembers).where(eq(teamMembers.userId, user.id));
    const myTeamJobIds = myTeam.map((t) => t.jobId);

    const conditions = [];
    if (status) conditions.push(eq(jobs.status, status as JobStatus));
    if (category) conditions.push(eq(jobs.category, category));
    if (mine === "1") conditions.push(eq(jobs.ownerId, user.id));
    if (!status && !mine) conditions.push(eq(jobs.status, "open"));
    if (!mine) {
      // General feed: never show the viewer's own jobs or jobs they're hired on
      conditions.push(ne(jobs.ownerId, user.id));
      if (myTeamJobIds.length > 0) conditions.push(notInArray(jobs.id, myTeamJobIds));
    }
    if (mine === "1") conditions.push(ne(jobs.status, "delisted"));

    const base = db.select().from(jobs);
    const rows = await (conditions.length > 0
      ? base.where(and(...conditions))
      : base
    ).orderBy(desc(jobs.createdAt));

    let filtered = rows;
    if (skill) {
      filtered = rows.filter((j) => {
        const skills: string[] = JSON.parse(j.requiredSkills || "[]");
        return skills.some((s) => s.toLowerCase().includes(skill.toLowerCase()));
      });
    }

    const enriched = await Promise.all(
      filtered.map(async (j) => {
        const details = await jobWithDetails(db, j);
        const apps = await db.select().from(applications).where(eq(applications.jobId, j.id));
        const team = await getTeam(db, j.id);
        const positionFill = parsePositions(j).map((p) => ({
          ...p,
          filled: team.filter((t) => t.positionId === p.id).length,
        }));
        const [myApp] = await db
          .select()
          .from(applications)
          .where(and(eq(applications.jobId, j.id), eq(applications.applicantId, user.id)));
        return {
          ...details,
          applicationCount: apps.length,
          positionFill,
          myApplication: myApp ? { status: myApp.status, positionId: myApp.positionId } : null,
        };
      })
    );

    return c.json(enriched);
  });

  // Job detail
  app.get("/:id", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Not found" }, 404);

    const details = await jobWithDetails(db, job);
    const jobMilestones = await db.select().from(milestones).where(eq(milestones.jobId, id));

    const isOwner = job.ownerId === user.id;
    const isMentor = job.mentorId === user.id;
    const isAdmin = user.role === "admin";
    const onTeam = await isTeamMember(db, id, user.id);

    const jobApplications = await db.select().from(applications).where(eq(applications.jobId, id));
    const team = await getTeam(db, id);

    const updates = await db.select().from(jobUpdates).where(eq(jobUpdates.jobId, id));
    const jobReviews = await db.select().from(reviews).where(eq(reviews.jobId, id));
    const enrichedReviews = await Promise.all(
      jobReviews.map(async (r) => {
        const [reviewer] = await db.select().from(users).where(eq(users.id, r.reviewerId));
        const [reviewee] = await db.select().from(users).where(eq(users.id, r.revieweeId));
        return {
          ...r,
          reviewerName: reviewer?.name || "Unknown",
          revieweeName: reviewee?.name || "Unknown",
        };
      })
    );

    // Quotes: visible to owner, mentor, admin. Applicants see their own status via /mine.
    let visibleApplications = jobApplications;
    if (!isOwner && !isMentor && !isAdmin) {
      visibleApplications = jobApplications.filter((a) => a.applicantId === user.id);
    }

    // Linked code-review repos (participants only)
    let linkedRepos: typeof aiRepos.$inferSelect[] = [];
    if (isOwner || isMentor || isAdmin || onTeam) {
      linkedRepos = await db.select().from(aiRepos).where(eq(aiRepos.jobId, id));
    }
    const aiReposEnriched = await Promise.all(
      linkedRepos.map(async (r) => {
        const lastRuns = await db
          .select()
          .from(reviewRuns)
          .where(eq(reviewRuns.repoId, r.id))
          .orderBy(desc(reviewRuns.createdAt))
          .limit(5);
        return {
          id: r.id,
          owner: r.owner,
          repo: r.repo,
          branch: r.branch,
          lastReviewedSha: r.lastReviewedSha,
          lastRun: lastRuns[0]
            ? {
                commitSha: lastRuns[0].commitSha,
                status: lastRuns[0].status,
                rating: lastRuns[0].rating,
                summary: lastRuns[0].summary,
                commentUrl: lastRuns[0].commentUrl,
                createdAt: lastRuns[0].createdAt,
              }
            : null,
          runs: lastRuns.map((run) => ({
            id: run.id,
            kind: run.kind,
            prNumber: run.prNumber,
            commitSha: run.commitSha,
            commitMessage: run.commitMessage,
            status: run.status,
            rating: run.rating,
            summary: run.summary,
            commentUrl: run.commentUrl,
            createdAt: run.createdAt,
          })),
        };
      })
    );

    return c.json({
      ...details,
      milestones: jobMilestones,
      applications: visibleApplications,
      team,
      updates,
      reviews: enrichedReviews,
      aiRepos: aiReposEnriched,
      myRole: isOwner ? "owner" : onTeam ? "team" : isMentor ? "mentor" : isAdmin ? "admin" : null,
    });
  });

  // Edit job details (owner, while draft or open)
  app.patch("/:id", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();
    const body = await c.req.json();
    const parsed = editJobSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Not found" }, 404);
    if (job.ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);
    if (!["draft", "open"].includes(job.status)) {
      return c.json({ error: "Details can only be edited while the job is a draft or open" }, 400);
    }

    const patch: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.requiredSkills) patch.requiredSkills = JSON.stringify(parsed.data.requiredSkills);

    await db.update(jobs).set(patch).where(eq(jobs.id, id));
    await logUpdate(db, id, user.id, "system", "Job details updated.");

    const [updated] = await db.select().from(jobs).where(eq(jobs.id, id));
    return c.json(await jobWithDetails(db, updated));
  });

  // Publish (owner)
  app.patch("/:id/publish", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Not found" }, 404);
    if (job.ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);
    if (parsePositions(job).length === 0) {
      return c.json({ error: "Add at least one position before publishing" }, 400);
    }

    const result = await transitionJobStatus(db, id, "open", user.id);
    if (!result.ok) return c.json({ error: result.error }, 400);
    await logUpdate(db, id, user.id, "system", "Job published and open for quotes.");
    return c.json({ ok: true });
  });

  // Cancel (owner; draft/open/awarded only via state machine)
  app.patch("/:id/cancel", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Not found" }, 404);
    if (job.ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);

    const result = await transitionJobStatus(db, id, "cancelled", user.id);
    if (!result.ok) return c.json({ error: result.error }, 400);
    await logUpdate(db, id, user.id, "system", "Job cancelled by owner.");
    return c.json({ ok: true });
  });

  // Add milestones (owner)
  app.post("/:id/milestones", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();
    const body = await c.req.json();
    const parsed = addMilestonesSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Not found" }, 404);
    if (job.ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);

    const existing = await db.select().from(milestones).where(eq(milestones.jobId, id));
    const nextOrder = existing.length + 1;

    await db.insert(milestones).values(
      parsed.data.milestones.map((m, i) => ({
        id: crypto.randomUUID(),
        jobId: id,
        title: m.title,
        dueDate: m.dueDate,
        order: nextOrder + i,
      }))
    );

    return c.json({ ok: true });
  });

  // Progress timeline — visible ONLY to owner, hired team, assigned mentor (and admin)
  app.get("/:id/updates", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Not found" }, 404);

    const onTeam = await isTeamMember(db, id, user.id);
    const isParticipant =
      user.role === "admin" ||
      job.ownerId === user.id ||
      onTeam ||
      job.mentorId === user.id;
    if (!isParticipant) return c.json({ error: "Forbidden" }, 403);

    const updates = await db
      .select()
      .from(jobUpdates)
      .where(eq(jobUpdates.jobId, id))
      .orderBy(jobUpdates.createdAt);

    const enriched = await Promise.all(
      updates.map(async (u) => {
        const [author] = u.authorId
          ? await db.select().from(users).where(eq(users.id, u.authorId))
          : [undefined];
        const [milestone] = u.milestoneId
          ? await db.select().from(milestones).where(eq(milestones.id, u.milestoneId))
          : [undefined];
        return {
          ...u,
          authorName: author?.name || "System",
          authorRole: author?.role || "system",
          milestoneTitle: milestone?.title || null,
          attachments: u.attachments ? JSON.parse(u.attachments) : [],
        };
      })
    );

    return c.json(enriched);
  });

  // Post a progress update / comment (owner, team, mentor)
  app.post("/:id/updates", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();
    const body = await c.req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Not found" }, 404);

    const onTeam = await isTeamMember(db, id, user.id);
    const isParticipant =
      user.role === "admin" ||
      job.ownerId === user.id ||
      onTeam ||
      job.mentorId === user.id;
    if (!isParticipant) return c.json({ error: "Forbidden" }, 403);

    await logUpdate(db, id, user.id, "update", parsed.data.content);
    return c.json({ ok: true }, 201);
  });

  // Any team member (or the owner) starts work (awarded -> in_progress)
  app.post("/:id/start", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Not found" }, 404);
    const onTeam = await isTeamMember(db, id, user.id);
    if (!onTeam && job.ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);

    const result = await transitionJobStatus(db, id, "in_progress", user.id);
    if (!result.ok) return c.json({ error: result.error }, 400);
    await logUpdate(db, id, user.id, "system", "Work started.");
    return c.json({ ok: true });
  });

  // A team member delivers final work (with optional file attachments)
  app.post("/:id/deliver", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();
    const body = await c.req.json();
    const parsed = deliverSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Not found" }, 404);
    const onTeam = await isTeamMember(db, id, user.id);
    if (!onTeam) return c.json({ error: "Only team members can deliver work" }, 403);

    const result = await transitionJobStatus(db, id, "delivered", user.id);
    if (!result.ok) return c.json({ error: result.error }, 400);

    const attachments = (parsed.data.fileKeys ?? []).map((key) => ({
      key,
      name: key.split("/").pop()?.split("-").slice(1).join("-") || "file",
    }));

    await db.insert(jobUpdates).values({
      id: crypto.randomUUID(),
      jobId: id,
      authorId: user.id,
      kind: "submission",
      content: parsed.data.content,
      attachments: attachments.length ? JSON.stringify(attachments) : null,
    });
    return c.json({ ok: true });
  });

  // Owner accepts final delivery -> completed (owner or admin)
  app.post("/:id/accept", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Not found" }, 404);
    if (job.ownerId !== user.id && user.role !== "admin") {
      return c.json({ error: "Only the owner (or an admin) can mark the job as done" }, 403);
    }

    const result = await transitionJobStatus(db, id, "completed", user.id);
    if (!result.ok) return c.json({ error: result.error }, 400);
    await logUpdate(db, id, user.id, "system", "Owner accepted the delivery. Job completed!");
    await notifyJobParticipants(
      c.env,
      db,
      id,
      `SkillBridge: ${job.title} — job completed 🎉`,
      `The job "${job.title}" has been completed. Log in to leave a review for the other party.`
    );
    return c.json({ ok: true });
  });

  // Restart a completed job (owner, team, mentor or admin)
  app.post("/:id/restart", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Not found" }, 404);

    const onTeam = await isTeamMember(db, id, user.id);
    const isParticipant =
      user.role === "admin" || job.ownerId === user.id || onTeam || job.mentorId === user.id;
    if (!isParticipant) return c.json({ error: "Forbidden" }, 403);
    if (job.status !== "completed") {
      return c.json({ error: "Only completed jobs can be restarted" }, 400);
    }

    const result = await transitionJobStatus(db, id, "in_progress", user.id);
    if (!result.ok) return c.json({ error: result.error }, 400);
    await logUpdate(db, id, user.id, "system", `${user.name} restarted the job — work has resumed.`);
    await notifyJobParticipants(
      c.env,
      db,
      id,
      `SkillBridge: ${job.title} — job restarted`,
      `${user.name} restarted the job "${job.title}". Work has resumed — check the progress timeline.`
    );
    return c.json({ ok: true });
  });

  // Owner requests revision
  app.post("/:id/revision", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();
    const body = await c.req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Not found" }, 404);
    if (job.ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);

    const result = await transitionJobStatus(db, id, "revision_requested", user.id);
    if (!result.ok) return c.json({ error: result.error }, 400);
    await logUpdate(db, id, user.id, "revision", parsed.data.content);
    return c.json({ ok: true });
  });

  // Dispute (owner or any team member)
  app.post("/:id/dispute", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { id } = c.req.param();
    const body = await c.req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return c.json({ error: "Not found" }, 404);
    const onTeam = await isTeamMember(db, id, user.id);
    if (job.ownerId !== user.id && !onTeam) return c.json({ error: "Forbidden" }, 403);

    const result = await transitionJobStatus(db, id, "disputed", user.id);
    if (!result.ok) return c.json({ error: result.error }, 400);
    await logUpdate(db, id, user.id, "system", `Dispute raised: ${parsed.data.content}`);
    return c.json({ ok: true });
  });

  return app;
}