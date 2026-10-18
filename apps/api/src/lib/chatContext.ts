import { eq, and, asc, desc } from "drizzle-orm";
import {
  jobs,
  users,
  profiles,
  businessProfiles,
  mentorProfiles,
  applications,
  teamMembers,
  milestones,
  jobUpdates,
  aiRepos,
  reviewRuns,
} from "../db/schema";
import type { AppEnv, AuthUser } from "../types";

type DB = AppEnv["Variables"]["db"];

const clip = (s: string | null | undefined, n: number) =>
  s && s.length > n ? `${s.slice(0, n - 1)}…` : (s ?? "");

function parsePositions(job: { positions: string | null }): { id: string; title: string; count: number }[] {
  try {
    return JSON.parse(job.positions || "[]");
  } catch {
    return [];
  }
}

function positionTitle(job: { positions: string | null }, positionId: string): string {
  const pos = parsePositions(job).find((p) => p.id === positionId);
  return pos?.title ?? positionId;
}

interface RoomMessage {
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: string;
}

async function roomMessages(
  env: AppEnv["Bindings"],
  room: string,
  limit: number
): Promise<RoomMessage[]> {
  try {
    const stub = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(room));
    const res = await stub.fetch("https://do/messages");
    const data = (await res.json()) as { messages: RoomMessage[] };
    return data.messages.slice(-limit);
  } catch {
    return [];
  }
}

// Builds the full page context for the AI assistant:
// the caller's profile, the job they are viewing, their proposal/quote,
// and — for participants — the mentor, team, milestones, timeline,
// linked GitHub repos with AI review history, and chat transcripts.
export async function buildChatContext(
  env: AppEnv["Bindings"],
  db: DB,
  user: AuthUser,
  jobId: string | undefined,
  mode: "owner" | "student" | "mentor"
): Promise<string> {
  const sections: string[] = [];

  // ---- 1. The caller's own profile ----
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  const [biz] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, user.id));
  const [mp] = await db.select().from(mentorProfiles).where(eq(mentorProfiles.userId, user.id));
  const me = [
    `Name: ${user.name}`,
    `Role: ${user.role}`,
    profile?.bio ? `Bio: ${clip(profile.bio, 300)}` : "",
    profile?.skills
      ? `Skills: ${(JSON.parse(profile.skills || "[]") as string[]).join(", ") || "none listed"}`
      : "Skills: none listed",
    profile?.college ? `College: ${profile.college}` : "",
    profile?.city ? `City: ${profile.city}` : "",
    profile?.linkedin ? `LinkedIn: ${profile.linkedin}` : "",
    profile?.github ? `GitHub: ${profile.github}` : "",
    profile?.portfolio ? `Portfolio: ${profile.portfolio}` : "",
    biz
      ? `Business: ${biz.businessName} (sector: ${biz.sector ?? "n/a"}, city: ${biz.city ?? "n/a"}, verification: ${biz.verificationStatus})`
      : "",
    mp?.expertise
      ? `Mentor expertise: ${(JSON.parse(mp.expertise || "[]") as string[]).join(", ") || "n/a"}`
      : "",
    mp?.organization ? `Mentor organization: ${mp.organization}` : "",
  ].filter(Boolean);
  sections.push(`YOUR PROFILE:\n${me.join("\n")}`);

  if (!jobId) return sections.join("\n\n");

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) {
    sections.push("JOB PAGE: the job id given was not found (stale page context).");
    return sections.join("\n\n");
  }

  const [owner] = await db.select().from(users).where(eq(users.id, job.ownerId));
  const team = await db.select().from(teamMembers).where(eq(teamMembers.jobId, jobId));
  const teamNames = await Promise.all(
    team.map(async (t) => {
      const [u] = await db.select().from(users).where(eq(users.id, t.userId));
      return `${u?.name ?? "unknown"} (${t.positionTitle})`;
    })
  );
  const isParticipant =
    user.role === "admin" ||
    job.ownerId === user.id ||
    job.mentorId === user.id ||
    team.some((t) => t.userId === user.id);

  // ---- 2. The job posting ----
  const jobLines = [
    `Title: ${job.title}`,
    `Category: ${job.category}`,
    `Status: ${job.status}`,
    `Description: ${clip(job.description, 600)}`,
    `Required skills: ${(JSON.parse(job.requiredSkills || "[]") as string[]).join(", ") || "none listed"}`,
    job.positions
      ? `Positions: ${parsePositions(job).map((p) => `${p.title} x${p.count}`).join(", ")}`
      : "",
    `Budget: ₹${job.budgetMin ?? "?"} - ₹${job.budgetMax ?? "?"}`,
    `Deadline: ${job.deadline ?? "flexible"}`,
    job.acceptanceCriteria ? `Acceptance criteria: ${clip(job.acceptanceCriteria, 400)}` : "",
    `Owner: ${owner?.name ?? "unknown"}`,
    job.attachments
      ? `Reference files: ${(JSON.parse(job.attachments) as { name: string }[]).map((a) => a.name).join(", ")}`
      : "",
  ].filter(Boolean);
  sections.push(`JOB PAGE — ${job.title}:\n${jobLines.join("\n")}`);

  // ---- 3. Proposals ----
  if (mode === "owner" && isParticipant) {
    const apps = await db.select().from(applications).where(eq(applications.jobId, jobId));
    if (apps.length) {
      const lines = await Promise.all(
        apps.slice(0, 12).map(async (a) => {
          const [ap] = await db.select().from(users).where(eq(users.id, a.applicantId));
          return `- ${ap?.name ?? "applicant"} → ${positionTitle(job, a.positionId)}: ₹${a.quoteAmount ?? "?"} [${a.status}] — ${clip(a.pitch, 160)}`;
        })
      );
      sections.push(`PROPOSALS RECEIVED (${apps.length}):\n${lines.join("\n")}`);
    } else {
      sections.push("PROPOSALS RECEIVED: none yet.");
    }
  } else {
    const own = await db
      .select()
      .from(applications)
      .where(and(eq(applications.jobId, jobId), eq(applications.applicantId, user.id)));
    if (own.length) {
      const lines = own.map(
        (a) =>
          `- Position: ${positionTitle(job, a.positionId)}\n  Quote: ₹${a.quoteAmount ?? "?"}\n  Status: ${a.status}\n  Pitch: ${clip(a.pitch, 300)}`
      );
      sections.push(`YOUR PROPOSAL ON THIS JOB:\n${lines.join("\n")}`);
    } else if (mode === "student") {
      sections.push("YOUR PROPOSAL ON THIS JOB: none submitted yet.");
    }
  }

  if (!isParticipant) {
    sections.push(
      "ACCESS NOTE: you are not (yet) a participant on this job — you can only see the public posting and your own proposal."
    );
    return sections.join("\n\n");
  }

  // ---- 4. Mentor ----
  const [mentor] = job.mentorId
    ? await db.select().from(users).where(eq(users.id, job.mentorId))
    : [undefined];
  const [mentorProf] = job.mentorId
    ? await db.select().from(mentorProfiles).where(eq(mentorProfiles.userId, job.mentorId))
    : [undefined];
  if (mentor) {
    const expertise = mentorProf?.expertise
      ? ` — expertise: ${(JSON.parse(mentorProf.expertise || "[]") as string[]).join(", ")}`
      : "";
    const gate = job.aiGateThreshold
      ? ` — AI review gate: final milestone requires code-review rating ≥ ${job.aiGateThreshold}/5`
      : "";
    sections.push(`MENTOR: ${mentor.name}${expertise}${gate}`);
  } else {
    sections.push("MENTOR: not assigned yet.");
  }

  // ---- 5. Team ----
  sections.push(
    `TEAM (${team.length} hired):\n${teamNames.length ? teamNames.map((n) => `- ${n}`).join("\n") : "- nobody hired yet"}`
  );

  // ---- 6. Milestones ----
  const ms = await db
    .select()
    .from(milestones)
    .where(eq(milestones.jobId, jobId))
    .orderBy(asc(milestones.order));
  if (ms.length) {
    sections.push(
      `MILESTONES:\n${ms.map((m) => `- [${m.status}] ${m.title}${m.dueDate ? ` (due ${m.dueDate})` : ""}`).join("\n")}`
    );
  }

  // ---- 7. Timeline ----
  const updates = await db
    .select()
    .from(jobUpdates)
    .where(eq(jobUpdates.jobId, jobId))
    .orderBy(desc(jobUpdates.createdAt))
    .limit(15);
  if (updates.length) {
    const lines = await Promise.all(
      updates.map(async (u) => {
        const [a] = u.authorId ? await db.select().from(users).where(eq(users.id, u.authorId)) : [undefined];
        const files = u.attachments
          ? ` (files: ${(JSON.parse(u.attachments) as { name: string }[]).map((f) => f.name).join(", ")})`
          : "";
        return `- [${u.kind}] ${a?.name ?? "System"} (${u.createdAt?.slice(0, 16) ?? ""}): ${clip(u.content, 200)}${files}`;
      })
    );
    sections.push(`TIMELINE (latest 15):\n${lines.join("\n")}`);
  }

  // ---- 8. Linked Git repos + AI review history ----
  const repos = await db.select().from(aiRepos).where(eq(aiRepos.jobId, jobId));
  if (repos.length) {
    const repoLines = await Promise.all(
      repos.map(async (r) => {
        const runs = await db
          .select()
          .from(reviewRuns)
          .where(eq(reviewRuns.repoId, r.id))
          .orderBy(desc(reviewRuns.createdAt))
          .limit(2);
        const runLines = await Promise.all(
          runs.map(async (run) => {
            const findings = run.findings
              ? ((JSON.parse(run.findings) as { severity?: string; file?: string; issue?: string }[]) ?? []).slice(0, 4)
              : [];
            const fl = findings
              .map((f) => `    • [${f.severity ?? "?"}] ${f.file ?? "?"}: ${clip(f.issue, 140)}`)
              .join("\n");
            return `  ${run.kind} ${run.commitSha.slice(0, 7)} [${run.status}]${
              run.rating != null ? ` — rating ${run.rating}/5` : ""
            }${run.summary ? ` — ${clip(run.summary, 300)}` : ""}${fl ? `\n${fl}` : ""}`;
          })
        );
        return `- ${r.owner}/${r.repo} (branch ${r.branch}, ${r.status})${
          runLines.length ? `\n${runLines.join("\n")}` : " — no reviews yet"
        }`;
      })
    );
    sections.push(`LINKED GIT REPOS & AI REVIEW HISTORY:\n${repoLines.join("\n")}`);
  }

  // ---- 9. Chats ----
  const group = await roomMessages(env, `job:${jobId}`, 25);
  if (group.length) {
    sections.push(
      `GROUP CHAT (owner + team + mentor, last ${group.length} messages):\n${group
        .map((m) => `- [${m.createdAt.slice(11, 16)}] ${m.senderName} (${m.senderRole}): ${clip(m.text, 150)}`)
        .join("\n")}`
    );
  }

  const isMentor = job.mentorId === user.id;
  const isTeamMember = team.some((t) => t.userId === user.id);
  if (isMentor || isTeamMember || user.role === "admin") {
    const privateMsgs = await roomMessages(env, `mentor:${jobId}`, 15);
    if (privateMsgs.length) {
      sections.push(
        `PRIVATE MENTOR CHAT (mentor + team, owner excluded, last ${privateMsgs.length} messages):\n${privateMsgs
          .map((m) => `- [${m.createdAt.slice(11, 16)}] ${m.senderName} (${m.senderRole}): ${clip(m.text, 150)}`)
          .join("\n")}`
      );
    }
  }

  const full = sections.join("\n\n");
  return clip(full, 15000);
}