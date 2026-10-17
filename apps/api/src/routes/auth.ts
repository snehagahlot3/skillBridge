import { Hono } from "hono";
import { z } from "zod";
import { sign } from "hono/jwt";
import { eq } from "drizzle-orm";
import { users, smeProfiles, studentProfiles, mentorProfiles } from "../db/schema";
import { hashPassword, verifyPassword } from "../lib/crypto";
import type { AppEnv } from "../types";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["sme", "student", "mentor"]),
  profile: z
    .object({
      businessName: z.string().optional(),
      sector: z.string().optional(),
      city: z.string().optional(),
      college: z.string().optional(),
      bio: z.string().optional(),
      skills: z.array(z.string()).optional(),
      expertise: z.array(z.string()).optional(),
      organization: z.string().optional(),
    })
    .optional(),
});

export function authRoutes() {
  const app = new Hono<AppEnv>();

  app.post("/signup", async (c) => {
    const db = c.var.db;
    const body = await c.req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const { email, password, name, role, profile } = parsed.data;

    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) return c.json({ error: "Email already registered" }, 409);

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({ id, email, passwordHash, name, role });

    if (role === "sme" && profile) {
      await db.insert(smeProfiles).values({
        userId: id,
        businessName: profile.businessName || name,
        sector: profile.sector,
        city: profile.city,
      });
    } else if (role === "student") {
      await db.insert(studentProfiles).values({
        userId: id,
        college: profile?.college,
        bio: profile?.bio,
        skills: JSON.stringify(profile?.skills || []),
        publicSlug: name.toLowerCase().replace(/\s+/g, "-") + "-" + id.slice(0, 4),
      });
    } else if (role === "mentor" && profile) {
      await db.insert(mentorProfiles).values({
        userId: id,
        expertise: JSON.stringify(profile.expertise || []),
        organization: profile.organization,
        bio: profile.bio,
      });
    }

    const token = await sign({ sub: id, role }, c.var.env.JWT_SECRET, "HS256");
    return c.json({ token, user: { id, email, name, role } });
  });

  app.post("/login", async (c) => {
    const db = c.var.db;
    const body = await c.req.json();
    const { email, password } = body;

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return c.json({ error: "Invalid credentials" }, 401);

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return c.json({ error: "Invalid credentials" }, 401);

    const token = await sign({ sub: user.id, role: user.role }, c.var.env.JWT_SECRET, "HS256");
    return c.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  });

  return app;
}
