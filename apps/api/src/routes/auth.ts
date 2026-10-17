import { Hono } from "hono";
import { z } from "zod";
import { sign } from "hono/jwt";
import { eq } from "drizzle-orm";
import { users, profiles } from "../db/schema";
import { hashPassword, verifyPassword } from "../lib/crypto";
import type { AppEnv } from "../types";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  profile: z
    .object({
      phone: z.string().optional(),
      city: z.string().optional(),
      college: z.string().optional(),
      bio: z.string().optional(),
      skills: z.array(z.string()).optional(),
    })
    .optional(),
});

function slugify(name: string, id: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${base || "user"}-${id.slice(0, 4)}`;
}

export function authRoutes() {
  const app = new Hono<AppEnv>();

  // Public signup: role is always "user". Mentors are created by admins.
  app.post("/signup", async (c) => {
    const db = c.var.db;
    const body = await c.req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const { email, password, name, profile } = parsed.data;

    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) return c.json({ error: "Email already registered" }, 409);

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({ id, email, passwordHash, name, role: "user" });
    await db.insert(profiles).values({
      userId: id,
      phone: profile?.phone,
      city: profile?.city,
      college: profile?.college,
      bio: profile?.bio,
      skills: JSON.stringify(profile?.skills || []),
      publicSlug: slugify(name, id),
    });

    const token = await sign({ sub: id, role: "user" }, c.env.JWT_SECRET, "HS256");
    return c.json({ token, user: { id, email, name, role: "user" } });
  });

  app.post("/login", async (c) => {
    const db = c.var.db;
    const body = await c.req.json();
    const { email, password } = body;

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return c.json({ error: "Invalid credentials" }, 401);

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return c.json({ error: "Invalid credentials" }, 401);
    if (user.status === "blocked") {
      return c.json({ error: "This account has been blocked. Contact support." }, 403);
    }

    const token = await sign({ sub: user.id, role: user.role }, c.env.JWT_SECRET, "HS256");
    return c.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  });

  return app;
}