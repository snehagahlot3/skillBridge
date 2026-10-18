// Email workflow: Gmail SMTP (app password) over Workers TCP sockets.
// - EMAIL_MOCK=1: log as "mocked" without connecting (local dev/tests)
// - No GMAIL_USER/GMAIL_APP_PASSWORD configured: log as "skipped"
import { connect } from "cloudflare:sockets";
import { eq } from "drizzle-orm";
import { emailLog, jobs, users, teamMembers } from "../db/schema";
import type { DB } from "../db";
import type { Env } from "../types";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

async function logEmail(db: DB, msg: EmailMessage, status: "sent" | "mocked" | "skipped" | "failed", error?: string) {
  await db.insert(emailLog).values({
    id: crypto.randomUUID(),
    toEmail: msg.to,
    subject: msg.subject,
    bodyPreview: msg.text.slice(0, 300),
    status,
    error,
  });
}

function base64(s: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(s)));
}

// Minimal SMTP client over a TLS socket (port 465, implicit TLS)
async function smtpSend(msg: EmailMessage, user: string, pass: string): Promise<void> {
  const socket = connect(
    { hostname: "smtp.gmail.com", port: 465 },
    { secureTransport: "on", allowHalfOpen: false }
  );
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  async function readResponse(): Promise<string> {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // responses end with CRLF; wait until we have a complete line ending with a status
      const idx = buffer.lastIndexOf("\r\n");
      if (idx >= 0 && buffer.length - (idx + 2) <= 0) break;
    }
    const response = buffer;
    buffer = "";
    return response;
  }

  async function command(line: string): Promise<string> {
    await writer.write(new TextEncoder().encode(line + "\r\n"));
    return readResponse();
  }

  await readResponse(); // banner
  await command("EHLO skillbridge");
  await command("AUTH LOGIN");
  await command(base64(user));
  await command(base64(pass));
  await command(`MAIL FROM:<${user}>`);
  await command(`RCPT TO:<${msg.to}>`);
  await command("DATA");
  await writer.write(
    new TextEncoder().encode(
      `From: SkillBridge <${user}>\r\n` +
        `To: <${msg.to}>\r\n` +
        `Subject: ${msg.subject}\r\n` +
        `Content-Type: text/plain; charset=utf-8\r\n\r\n` +
        `${msg.text}\r\n.\r\n`
    )
  );
  await readResponse();
  await command("QUIT");

  writer.close();
  reader.releaseLock();
}

export async function sendEmail(env: Env, db: DB, msg: EmailMessage): Promise<void> {
  if (env.EMAIL_MOCK === "1") {
    await logEmail(db, msg, "mocked");
    return;
  }
  // Demo/seed accounts use non-deliverable addresses — fail silently.
  if (/@(demo|example|test)\.com$/i.test(msg.to)) {
    await logEmail(db, msg, "skipped", "demo address");
    return;
  }
  const user = env.GMAIL_USER;
  const pass = env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    await logEmail(db, msg, "skipped", "Gmail not configured");
    return;
  }
  try {
    await smtpSend(msg, user, pass);
    await logEmail(db, msg, "sent");
  } catch (err) {
    await logEmail(db, msg, "failed", String(err));
  }
}

export async function sendEmailTo(env: Env, db: DB, to: string | null | undefined, subject: string, text: string) {
  if (!to) return;
  await sendEmail(env, db, { to, subject, text });
}

// Email every participant of a job: owner + hired team + assigned mentor.
export async function notifyJobParticipants(
  env: Env,
  db: DB,
  jobId: string,
  subject: string,
  text: string
): Promise<void> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) return;

  const emails = new Set<string>();
  const [owner] = await db.select().from(users).where(eq(users.id, job.ownerId));
  if (owner?.email) emails.add(owner.email);
  if (job.mentorId) {
    const [mentor] = await db.select().from(users).where(eq(users.id, job.mentorId));
    if (mentor?.email) emails.add(mentor.email);
  }
  const team = await db.select().from(teamMembers).where(eq(teamMembers.jobId, jobId));
  for (const t of team) {
    const [member] = await db.select().from(users).where(eq(users.id, t.userId));
    if (member?.email) emails.add(member.email);
  }

  for (const email of emails) {
    await sendEmail(env, db, { to: email, subject, text });
  }
}