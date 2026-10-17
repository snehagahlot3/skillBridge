import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDb } from "./db";
import type { AppEnv } from "./types";
import { authRoutes } from "./routes/auth";
import { projectRoutes } from "./routes/projects";
import { applicationRoutes } from "./routes/applications";
import { submissionRoutes } from "./routes/submissions";
import { reviewRoutes } from "./routes/reviews";
import { passportRoutes } from "./routes/passport";
import { aiRoutes } from "./routes/ai";
import { adminRoutes } from "./routes/admin";

const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = [c.env.FRONTEND_URL, "http://localhost:3000"];
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
app.route("/api/projects", projectRoutes());
app.route("/api/applications", applicationRoutes());
app.route("/api/submissions", submissionRoutes());
app.route("/api/reviews", reviewRoutes());
app.route("/api/passport", passportRoutes());
app.route("/api/ai", aiRoutes());
app.route("/api/admin", adminRoutes());

app.get("/api/health", (c) => c.json({ ok: true }));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
