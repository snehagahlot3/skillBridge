import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, requireRole } from "../middleware/auth";
import type { AppEnv } from "../types";

const briefSchema = z.object({
  description: z.string().min(20),
  language: z.enum(["en", "hi"]).default("en"),
});

const SAMPLE_BRIEF = {
  title: "Inventory Stockout Dashboard",
  summary: "Build a simple dashboard that tracks inventory levels and alerts when stock falls below reorder points.",
  requiredSkills: ["Excel/Google Sheets", "Data Visualization", "Basic SQL"],
  deliverables: ["Dashboard with stock level visualization", "Automated low-stock alerts", "Weekly summary report"],
  milestones: [
    { title: "Data collection and cleaning", dueDate: "Week 1" },
    { title: "Dashboard prototype", dueDate: "Week 2" },
    { title: "Alert system and final delivery", dueDate: "Week 3" },
  ],
  acceptanceCriteria: "Dashboard loads real inventory data, shows stock levels visually, and sends alerts when items fall below threshold.",
  estimatedEffort: "15-20 hours over 3 weeks",
  suggestedRubric: [
    { criterion: "Data Accuracy", description: "Dashboard correctly reflects inventory data", maxScore: 4 },
    { criterion: "Visualization Quality", description: "Charts are clear and informative", maxScore: 4 },
    { criterion: "Alert System", description: "Low-stock alerts work reliably", maxScore: 4 },
    { criterion: "Documentation", description: "Clear instructions for SME to use the dashboard", maxScore: 4 },
    { criterion: "Timeliness", description: "Delivered within agreed deadline", maxScore: 4 },
  ],
};

export function aiRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);

  app.post("/project-brief", requireRole("user"), async (c) => {
    const body = await c.req.json();
    const parsed = briefSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    try {
      const prompt = `You are a project scoping assistant for SMEs. Convert this messy business description into a structured project brief. Respond with ONLY valid JSON matching this exact schema:
{
  "title": "short project title",
  "summary": "2-3 sentence summary",
  "requiredSkills": ["skill1", "skill2"],
  "deliverables": ["deliverable1", "deliverable2"],
  "milestones": [{"title": "milestone name", "dueDate": "Week N"}],
  "acceptanceCriteria": "clear acceptance criteria",
  "estimatedEffort": "X hours over Y weeks",
  "suggestedRubric": [{"criterion": "name", "description": "description", "maxScore": 4}]
}

Business description: ${parsed.data.description}`;

      const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
      });

      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");

      const brief = JSON.parse(jsonMatch[0]);
      return c.json(brief);
    } catch (error) {
      return c.json(SAMPLE_BRIEF);
    }
  });

  return app;
}
