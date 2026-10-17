import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// A single "user" account can both post jobs (business side) and
// apply to jobs (talent side). Mentors are created by admins.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["user", "mentor", "admin"] }).notNull(),
  status: text("status", { enum: ["active", "blocked"] })
    .default("active")
    .notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// One profile per user. Holds contact + talent/portfolio info.
export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey().references(() => users.id),
  phone: text("phone"),
  city: text("city"),
  college: text("college"),
  bio: text("bio"),
  skills: text("skills"), // JSON array
  publicSlug: text("public_slug").unique(),
  linkedin: text("linkedin"),
  github: text("github"),
  portfolio: text("portfolio"),
  resumeKey: text("resume_key"), // R2 object key
  resumeName: text("resume_name"),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// Business details, added lazily when a user posts a job.
export const businessProfiles = sqliteTable("business_profiles", {
  userId: text("user_id").primaryKey().references(() => users.id),
  businessName: text("business_name").notNull(),
  sector: text("sector"),
  city: text("city"),
  verificationStatus: text("verification_status", {
    enum: ["unverified", "pending", "verified"],
  })
    .default("unverified")
    .notNull(),
  udyamNumber: text("udyam_number"),
});

export const mentorProfiles = sqliteTable("mentor_profiles", {
  userId: text("user_id").primaryKey().references(() => users.id),
  expertise: text("expertise"), // JSON array
  organization: text("organization"),
  bio: text("bio"),
});

// Positions the owner wants to fill, e.g.
// [{id, title: "Marketing", count: 3}, {id, title: "Graphic Designer", count: 1}]
export type JobPosition = { id: string; title: string; count: number };

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  requiredSkills: text("required_skills"), // JSON array
  positions: text("positions"), // JSON array of JobPosition
  budgetMin: real("budget_min"),
  budgetMax: real("budget_max"),
  deadline: text("deadline"),
  acceptanceCriteria: text("acceptance_criteria"),
  status: text("status", {
    enum: [
      "draft",
      "open",
      "awarded",
      "in_progress",
      "delivered",
      "completed",
      "revision_requested",
      "disputed",
      "cancelled",
      "delisted",
    ],
  })
    .default("draft")
    .notNull(),
  mentorId: text("mentor_id").references(() => users.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Applications are quotes FOR A POSITION on a job.
export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id),
  applicantId: text("applicant_id").notNull().references(() => users.id),
  positionId: text("position_id").notNull(),
  pitch: text("pitch").notNull(),
  quoteAmount: real("quote_amount"),
  status: text("status", { enum: ["pending", "accepted", "rejected"] })
    .default("pending")
    .notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// The hired team: one row per hired user per job.
export const teamMembers = sqliteTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull().references(() => jobs.id),
    userId: text("user_id").notNull().references(() => users.id),
    positionId: text("position_id").notNull(),
    positionTitle: text("position_title").notNull(),
    joinedAt: text("joined_at").default(sql`(datetime('now'))`),
  },
  (t) => ({
    onePerUserPerJob: uniqueIndex("team_members_job_user_unique").on(t.jobId, t.userId),
  })
);

export const milestones = sqliteTable("milestones", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id),
  title: text("title").notNull(),
  dueDate: text("due_date"),
  status: text("status", { enum: ["pending", "submitted", "approved"] })
    .default("pending")
    .notNull(),
  order: integer("order").notNull(),
});

// Progress timeline: submissions, approvals, revisions, comments, system events.
export const jobUpdates = sqliteTable("job_updates", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id),
  authorId: text("author_id").references(() => users.id),
  kind: text("kind", {
    enum: ["update", "submission", "approval", "revision", "system"],
  })
    .default("update")
    .notNull(),
  milestoneId: text("milestone_id").references(() => milestones.id),
  content: text("content").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Ratings + comments after a job completes. Both directions:
// owner reviews each team member, each team member reviews the owner.
export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull().references(() => jobs.id),
    reviewerId: text("reviewer_id").notNull().references(() => users.id),
    revieweeId: text("reviewee_id").notNull().references(() => users.id),
    rating: integer("rating").notNull(), // 1..5
    comment: text("comment"),
    createdAt: text("created_at").default(sql`(datetime('now'))`),
  },
  (t) => ({
    onePerPair: uniqueIndex("reviews_job_reviewer_reviewee_unique").on(
      t.jobId,
      t.reviewerId,
      t.revieweeId
    ),
  })
);

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  details: text("details"),
  timestamp: text("timestamp").default(sql`(datetime('now'))`),
});

// AI GitHub code-review agent
export const aiRepos = sqliteTable("ai_repos", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  branch: text("branch").default("main").notNull(),
  tokenEnc: text("token_enc").notNull(), // AES-GCM iv+ciphertext, base64
  jobId: text("job_id").references(() => jobs.id),
  lastReviewedSha: text("last_reviewed_sha"),
  status: text("status", { enum: ["active", "paused"] })
    .default("active")
    .notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const reviewRuns = sqliteTable("review_runs", {
  id: text("id").primaryKey(),
  repoId: text("repo_id").notNull().references(() => aiRepos.id),
  commitSha: text("commit_sha").notNull(),
  commitMessage: text("commit_message"),
  status: text("status", { enum: ["running", "done", "failed"] }).notNull(),
  summary: text("summary"),
  rating: real("rating"),
  findings: text("findings"), // JSON array
  suggestedFixes: text("suggested_fixes"), // JSON array
  commentUrl: text("comment_url"),
  tokensUsed: integer("tokens_used"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});