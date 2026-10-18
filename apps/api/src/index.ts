import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDb } from "./db";
import type { AppEnv, Env } from "./types";
import { pollAllRepos } from "./lib/reviewEngine";
import { authRoutes } from "./routes/auth";
import { profileRoutes } from "./routes/profile";
import { jobRoutes } from "./routes/jobs";
import { applicationRoutes } from "./routes/applications";
import { milestoneRoutes } from "./routes/milestones";
import { reviewRoutes } from "./routes/reviews";
import { userRoutes } from "./routes/users";
import { mentorRoutes } from "./routes/mentor";
import { adminRoutes } from "./routes/admin";
import { chatRoutes } from "./routes/chat";
import { aiRoutes } from "./routes/ai";
import { fileRoutes } from "./routes/files";

const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = [c.env.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"];
      return allowed.includes(origin) ? origin : allowed[0];
    },
    credentials: true,
  })
);

app.use("*", async (c, next) => {
  c.set("db", createDb(c.env.DB));
  await next();
});

app.route("/api/auth", authRoutes());
app.route("/api/profile", profileRoutes());
app.route("/api/jobs", jobRoutes());
app.route("/api/applications", applicationRoutes());
app.route("/api/milestones", milestoneRoutes());
app.route("/api/reviews", reviewRoutes());
app.route("/api/users", userRoutes());
app.route("/api/mentor", mentorRoutes());
app.route("/api/admin", adminRoutes());
app.route("/api/chat", chatRoutes());
app.route("/api/ai", aiRoutes());
app.route("/api/files", fileRoutes());

app.get("/api/health", (c) => c.json({ ok: true }));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

export default {
  fetch: app.fetch,
  // Cron: poll connected repos for new commits and review them.
  scheduled: async (event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(pollAllRepos(env));
  },
};
export { ChatRoom } from "./durable/chat";