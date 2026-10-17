import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// A single "user" account can both post projects (business side) and
// work on/apply to projects (talent side). "mentor" is the admin panel.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["user", "mentor"] }).notNull(),
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
  passportConsent: integer("passport_consent", { mode: "boolean" }).default(false),
  linkedin: text("linkedin"),
  github: text("github"),
  portfolio: text("portfolio"),
  resumeKey: text("resume_key"), // R2 object key
  resumeName: text("resume_name"),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// Business details, added lazily when a user posts a project.
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

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  requiredSkills: text("required_skills"), // JSON array
  budgetType: text("budget_type", { enum: ["paid", "stipend", "unpaid"] }).notNull(),
  budgetAmount: real("budget_amount"),
  deadline: text("deadline"),
  acceptanceCriteria: text("acceptance_criteria"),
  rubric: text("rubric"), // JSON: [{criterion, description, maxScore}]
  status: text("status", {
    enum: [
      "draft",
      "open",
      "assigned",
      "in_progress",
      "submitted",
      "under_review",
      "completed",
      "revision_requested",
      "disputed",
    ],
  })
    .default("draft")
    .notNull(),
  mentorId: text("mentor_id").references(() => users.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  applicantId: text("applicant_id").notNull().references(() => users.id),
  pitch: text("pitch").notNull(),
  status: text("status", { enum: ["pending", "accepted", "rejected"] })
    .default("pending")
    .notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const milestones = sqliteTable("milestones", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  dueDate: text("due_date"),
  status: text("status", { enum: ["pending", "submitted", "approved"] })
    .default("pending")
    .notNull(),
  order: integer("order").notNull(),
});

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  milestoneId: text("milestone_id").notNull().references(() => milestones.id),
  applicantId: text("applicant_id").notNull().references(() => users.id),
  notes: text("notes"),
  fileUrls: text("file_urls"), // JSON array of R2 keys
  submittedAt: text("submitted_at").default(sql`(datetime('now'))`),
});

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id").notNull().references(() => submissions.id),
  reviewerId: text("reviewer_id").notNull().references(() => users.id),
  reviewerType: text("reviewer_type", { enum: ["mentor"] }).notNull(),
  rubricScores: text("rubric_scores"), // JSON: [{criterion, score}]
  comments: text("comments"),
  decision: text("decision", { enum: ["approved", "revision", "rejected"] }).notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const verifiedSkills = sqliteTable("verified_skills", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  skill: text("skill").notNull(),
  level: text("level", { enum: ["Beginner", "Intermediate", "Advanced"] }).notNull(),
  projectId: text("project_id").notNull().references(() => projects.id),
  reviewId: text("review_id").notNull().references(() => reviews.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  details: text("details"),
  timestamp: text("timestamp").default(sql`(datetime('now'))`),
});
