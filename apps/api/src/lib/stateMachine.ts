import type { DB } from "../db";
import { jobs, auditLog } from "../db/schema";
import { eq } from "drizzle-orm";

export type JobStatus =
  | "draft"
  | "open"
  | "awarded"
  | "in_progress"
  | "delivered"
  | "completed"
  | "revision_requested"
  | "disputed"
  | "cancelled"
  | "delisted";

const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["awarded", "in_progress", "cancelled", "delisted"],
  awarded: ["in_progress", "cancelled"],
  in_progress: ["delivered", "cancelled"],
  delivered: ["completed", "revision_requested", "disputed"],
  revision_requested: ["in_progress"],
  disputed: ["completed", "in_progress", "cancelled"],
  completed: ["in_progress"], // restart the job
  cancelled: [],
  delisted: ["open"],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function transitionJobStatus(
  db: DB,
  jobId: string,
  to: JobStatus,
  actorId: string
): Promise<{ ok: boolean; error?: string }> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) return { ok: false, error: "Job not found" };

  if (!canTransition(job.status, to)) {
    return { ok: false, error: `Cannot transition from ${job.status} to ${to}` };
  }

  await db.update(jobs).set({ status: to }).where(eq(jobs.id, jobId));

  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorId,
    action: "status_change",
    entity: "job",
    entityId: jobId,
    details: JSON.stringify({ from: job.status, to }),
  });

  return { ok: true };
}