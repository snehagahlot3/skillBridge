import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { jobs } from "../db/schema";
import { authMiddleware, requireRole } from "../middleware/auth";
import type { AppEnv } from "../types";

const briefSchema = z.object({
  description: z.string().min(20),
  language: z.enum(["en", "hi"]).default("en"),
});

const chatSchema = z.object({
  mode: z.enum(["owner", "student"]),
  jobId: z.string().optional(),
  message: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(10)
    .optional(),
});

const OWNER_SYSTEM = `You are SkillBridge's job-scoping assistant for small business owners.
You help a business owner turn a rough idea into a clear, well-scoped job posting for student/freelancer talent.
Guide them step by step to clarify: the goal, the deliverables, the skills needed, the timeline, and a sensible budget range.
When they are ready, summarize a crisp job brief with: title, description, required skills, budget suggestion (in INR), deadline suggestion and milestones.
Ask ONE focused question at a time if the idea is still vague. Keep replies short, practical and friendly.`;

const STUDENT_SYSTEM = `You are SkillBridge's student assistant.
You help a student/freelancer UNDERSTAND a job posting they want to work on: explain what the owner wants, what skills matter, what a good proposal/quote should cover, and what questions to ask.
Use the job details provided. Be encouraging but honest about gaps between the job requirements and the student's profile.
Keep replies short, structured and practical.`;

const CHAT_FALLBACK =
  "I'm sorry, the AI service is unavailable right now. Try again in a moment — meanwhile, you can draft your job with the description, required skills, budget range and deadline fields in the form.";

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

  // Conversational assistant: owner mode (formulate job ideas) and
  // student mode (understand a problem statement).
  app.post("/chat", async (c) => {
    const db = c.var.db;
    const body = await c.req.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    let system = OWNER_SYSTEM;
    if (parsed.data.mode === "student") {
      let context = "No specific job selected.";
      if (parsed.data.jobId) {
        const [job] = await db.select().from(jobs).where(eq(jobs.id, parsed.data.jobId));
        if (job) {
          context = [
            `Job title: ${job.title}`,
            `Description: ${job.description}`,
            `Required skills: ${JSON.parse(job.requiredSkills || "[]").join(", ") || "not listed"}`,
            `Budget range: ₹${job.budgetMin ?? "?"} - ₹${job.budgetMax ?? "?"}`,
            `Deadline: ${job.deadline ?? "flexible"}`,
            job.acceptanceCriteria ? `Acceptance criteria: ${job.acceptanceCriteria}` : "",
          ]
            .filter(Boolean)
            .join("\n");
        }
      }
      system = `${STUDENT_SYSTEM}\n\nJOB POSTING:\n${context}`;
    }

    const messages: { role: string; content: string }[] = [
      { role: "system", content: system },
      ...(parsed.data.history ?? []),
      { role: "user", content: parsed.data.message },
    ];

    try {
      const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages,
        max_tokens: 700,
      });
      return c.json({ reply: response.response });
    } catch (error) {
      console.error("AI chat failed:", error);
      return c.json({ reply: CHAT_FALLBACK });
    }
  });

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
