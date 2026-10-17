import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { jobs, users, teamMembers } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv, AuthUser } from "../types";

// Two rooms per job:
//  - group:   owner + whole team + assigned mentor  (room `job:<jobId>`)
//  - mentor:  private mentor <-> team, owner excluded (room `mentor:<jobId>`)
export type ChatScope = "group" | "mentor";

function roomId(jobId: string, scope: ChatScope) {
  return scope === "mentor" ? `mentor:${jobId}` : `job:${jobId}`;
}

async function onTeam(db: AppEnv["Variables"]["db"], jobId: string, userId: string) {
  const rows = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.jobId, jobId), eq(teamMembers.userId, userId)));
  return rows.length > 0;
}

async function canJoin(
  db: AppEnv["Variables"]["db"],
  user: AuthUser,
  job: typeof jobs.$inferSelect,
  scope: ChatScope
): Promise<boolean> {
  if (user.role === "admin") return true;
  const member = await onTeam(db, job.id, user.id);
  if (scope === "mentor") {
    // private room: mentor + team only (owner excluded)
    return member || job.mentorId === user.id;
  }
  return member || job.ownerId === user.id || job.mentorId === user.id;
}

export function chatRoutes() {
  const app = new Hono<AppEnv>();

  // WebSocket endpoint. Registered BEFORE authMiddleware because browsers
  // cannot set Authorization headers on WS handshakes — the token travels
  // as a query param and is verified inline below.
  app.get("/ws/:jobId", async (c) => {
    const db = c.var.db;
    const { jobId } = c.req.param();
    const token = c.req.query("token");
    const scope: ChatScope = c.req.query("scope") === "mentor" ? "mentor" : "group";

    if (!token) return c.json({ error: "Missing token" }, 401);

    let auth: AuthUser;
    try {
      const { verify } = await import("hono/jwt");
      const payload = await verify(token, c.env.JWT_SECRET, "HS256");
      const sub = payload.sub as string;
      const [u] = await db.select().from(users).where(eq(users.id, sub));
      if (!u || u.status === "blocked") return c.json({ error: "Unauthorized" }, 401);
      auth = { id: u.id, email: u.email, name: u.name, role: u.role };
    } catch {
      return c.json({ error: "Invalid token" }, 401);
    }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (!(await canJoin(db, auth, job, scope))) return c.json({ error: "Forbidden" }, 403);

    const stub = c.env.CHAT_ROOM.get(c.env.CHAT_ROOM.idFromName(roomId(jobId, scope)));

    const headers = new Headers();
    headers.set("Upgrade", "websocket");
    const upgradeReq = new Request(`https://do/ws?jobId=${jobId}&scope=${scope}`, { headers });

    const res = await stub.fetch(upgradeReq);
    return res;
  });

  app.use("*", authMiddleware);

  // Rooms where I participate + unread counts (both scopes)
  app.get("/rooms", async (c) => {
    const db = c.var.db;
    const user = c.get("user");

    const all = await db.select().from(jobs);
    const myTeam = await db.select().from(teamMembers).where(eq(teamMembers.userId, user.id));
    const teamJobIds = new Set(myTeam.map((t) => t.jobId));

    const mine = all.filter(
      (j) => j.ownerId === user.id || j.mentorId === user.id || teamJobIds.has(j.id)
    );

    const rooms = [];
    for (const j of mine) {
      const team = await db.select().from(teamMembers).where(eq(teamMembers.jobId, j.id));
      const teamNames = (
        await Promise.all(
          team.map(async (t) => {
            const [u] = await db.select().from(users).where(eq(users.id, t.userId));
            return u?.name || null;
          })
        )
      ).filter(Boolean) as string[];
      const [mentor] = j.mentorId
        ? await db.select().from(users).where(eq(users.id, j.mentorId))
        : [undefined];

      const base = { jobId: j.id, title: j.title, status: j.status, teamNames, mentorName: mentor?.name || null };

      const scopes: ChatScope[] = [];
      const isOwner = j.ownerId === user.id;
      const isMentor = j.mentorId === user.id;
      const isTeam = teamJobIds.has(j.id);
      if (isOwner || isMentor || isTeam) scopes.push("group");
      if (isMentor || isTeam) scopes.push("mentor");

      for (const scope of scopes) {
        const stub = c.env.CHAT_ROOM.get(c.env.CHAT_ROOM.idFromName(roomId(j.id, scope)));
        let unread = 0;
        try {
          const res = await stub.fetch(`https://do/unread?userId=${user.id}`);
          const data = (await res.json()) as { unread: number };
          unread = data.unread;
        } catch {
          // ignore
        }
        rooms.push({ ...base, scope, unread });
      }
    }

    return c.json(rooms);
  });

  // History
  app.get("/:jobId/messages", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { jobId } = c.req.param();
    const scope: ChatScope = c.req.query("scope") === "mentor" ? "mentor" : "group";

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (!(await canJoin(db, user, job, scope))) return c.json({ error: "Forbidden" }, 403);

    const stub = c.env.CHAT_ROOM.get(c.env.CHAT_ROOM.idFromName(roomId(jobId, scope)));
    const res = await stub.fetch("https://do/messages");
    return c.json(await res.json());
  });

  // Send (REST fallback)
  app.post("/:jobId/messages", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { jobId } = c.req.param();
    const scope: ChatScope = c.req.query("scope") === "mentor" ? "mentor" : "group";
    const body = (await c.req.json()) as { text?: string };

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (!(await canJoin(db, user, job, scope))) return c.json({ error: "Forbidden" }, 403);
    if (!body.text || !body.text.trim()) return c.json({ error: "Message is required" }, 400);

    const stub = c.env.CHAT_ROOM.get(c.env.CHAT_ROOM.idFromName(roomId(jobId, scope)));
    const res = await stub.fetch("https://do/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: `${scope}:${jobId}`,
        senderId: user.id,
        senderName: user.name,
        senderRole: user.role,
        text: body.text.trim(),
      }),
    });
    return c.json(await res.json());
  });

  // Mark read
  app.post("/:jobId/read", async (c) => {
    const db = c.var.db;
    const user = c.get("user");
    const { jobId } = c.req.param();
    const scope: ChatScope = c.req.query("scope") === "mentor" ? "mentor" : "group";

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job) return c.json({ error: "Job not found" }, 404);
    if (!(await canJoin(db, user, job, scope))) return c.json({ error: "Forbidden" }, 403);

    const stub = c.env.CHAT_ROOM.get(c.env.CHAT_ROOM.idFromName(roomId(jobId, scope)));
    const res = await stub.fetch("https://do/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    return c.json(await res.json());
  });

  return app;
}