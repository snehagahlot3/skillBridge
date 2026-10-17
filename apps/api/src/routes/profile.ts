import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { profiles, businessProfiles, mentorProfiles } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";

const profileSchema = z.object({
  phone: z.string().optional(),
  city: z.string().optional(),
  college: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
});

const businessSchema = z.object({
  businessName: z.string().min(1),
  sector: z.string().optional(),
  city: z.string().optional(),
  udyamNumber: z.string().optional(),
});

export function profileRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);

  app.get("/me", async (c) => {
    const db = c.var.db;
    const user = c.var.user;

    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
    const [business] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, user.id));
    const [mentor] = await db.select().from(mentorProfiles).where(eq(mentorProfiles.userId, user.id));

    return c.json({
      user,
      profile: profile ? { ...profile, skills: JSON.parse(profile.skills || "[]") } : null,
      business: business ?? null,
      mentor: mentor ? { ...mentor, expertise: JSON.parse(mentor.expertise || "[]") } : null,
    });
  });

  app.patch("/", async (c) => {
    const db = c.var.db;
    const user = c.var.user;
    const body = await c.req.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [existing] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
    const data = parsed.data;
    const patch: Record<string, unknown> = {
      ...data,
      skills: data.skills ? JSON.stringify(data.skills) : undefined,
      updatedAt: new Date().toISOString(),
    };
    if (patch.skills === undefined) delete patch.skills;

    if (existing) {
      await db.update(profiles).set(patch).where(eq(profiles.userId, user.id));
    } else {
      await db.insert(profiles).values({
        userId: user.id,
        ...data,
        skills: JSON.stringify(data.skills || []),
        publicSlug: `${user.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${user.id.slice(0, 4)}`,
      });
    }

    return c.json({ ok: true });
  });

  app.put("/business", async (c) => {
    const db = c.var.db;
    const user = c.var.user;
    const body = await c.req.json();
    const parsed = businessSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const [existing] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, user.id));
    if (existing) {
      await db.update(businessProfiles).set(parsed.data).where(eq(businessProfiles.userId, user.id));
    } else {
      await db.insert(businessProfiles).values({ userId: user.id, ...parsed.data });
    }

    const [business] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, user.id));
    return c.json(business);
  });

  app.post("/resume", async (c) => {
    const db = c.var.db;
    const user = c.var.user;

    const form = await c.req.formData();
    const file = form.get("file") as unknown;
    if (!file || typeof file === "string" || typeof (file as Blob).arrayBuffer !== "function") {
      return c.json({ error: "No file provided" }, 400);
    }
    const blob = file as Blob & { name?: string };
    const filename = blob.name || "resume";

    const key = `resumes/${user.id}/${crypto.randomUUID()}-${filename}`;
    await c.env.BUCKET.put(key, await blob.arrayBuffer(), {
      httpMetadata: { contentType: blob.type || "application/octet-stream" },
    });

    const [existing] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
    if (existing) {
      await db.update(profiles).set({ resumeKey: key, resumeName: filename }).where(eq(profiles.userId, user.id));
    } else {
      await db.insert(profiles).values({
        userId: user.id,
        resumeKey: key,
        resumeName: filename,
        publicSlug: `${user.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${user.id.slice(0, 4)}`,
      });
    }

    return c.json({ key, name: filename });
  });

  app.get("/resume/:userId", async (c) => {
    const db = c.var.db;
    const { userId } = c.req.param();

    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    if (!profile?.resumeKey) return c.json({ error: "No resume found" }, 404);

    const object = await c.env.BUCKET.get(profile.resumeKey);
    if (!object) return c.json({ error: "Resume file missing" }, 404);

    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${profile.resumeName || "resume"}"`,
      },
    });
  });

  return app;
}