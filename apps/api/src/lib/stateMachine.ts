import type { DB } from "../db";
import { projects, auditLog } from "../db/schema";
import { eq } from "drizzle-orm";

export type ProjectStatus =
  | "draft"
  | "open"
  | "assigned"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "completed"
  | "revision_requested"
  | "disputed";

const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["open"],
  open: ["assigned"],
  assigned: ["in_progress"],
  in_progress: ["submitted", "revision_requested"],
  submitted: ["under_review", "revision_requested"],
  under_review: ["completed", "revision_requested", "disputed"],
  revision_requested: ["in_progress", "submitted"],
  completed: ["disputed"],
  disputed: ["completed", "revision_requested"],
};

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function transitionProjectStatus(
  db: DB,
  projectId: string,
  to: ProjectStatus,
  actorId: string
): Promise<{ ok: boolean; error?: string }> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return { ok: false, error: "Project not found" };

  if (!canTransition(project.status, to)) {
    return { ok: false, error: `Cannot transition from ${project.status} to ${to}` };
  }

  await db.update(projects).set({ status: to }).where(eq(projects.id, projectId));

  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorId,
    action: "status_change",
    entity: "project",
    entityId: projectId,
    details: JSON.stringify({ from: project.status, to }),
  });

  return { ok: true };
}
