import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import type { AppEnv, AuthUser } from "../types";

export type { AuthUser };

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verify(token, c.env.JWT_SECRET, "HS256");
    const sub = payload.sub as string;
    const [user] = await c.var.db.select().from(users).where(eq(users.id, sub));
    if (!user) return c.json({ error: "User not found" }, 401);
    if (user.status === "blocked") {
      return c.json({ error: "This account has been blocked. Contact support." }, 403);
    }

    c.set("user", { id: user.id, email: user.email, name: user.name, role: user.role });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }

  await next();
});

export const requireRole = (...roles: AuthUser["role"][]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (!roles.includes(c.var.user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  });