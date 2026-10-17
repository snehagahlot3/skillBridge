import type { DB } from "./db";

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  AI: any;
  CHAT_ROOM: DurableObjectNamespace;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  AI_GITHUB_MOCK?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "mentor" | "admin";
}

export interface Variables {
  db: DB;
  user: AuthUser;
}

export type AppEnv = { Bindings: Env; Variables: Variables };