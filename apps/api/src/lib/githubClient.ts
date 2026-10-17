// GitHub REST client for the code-review agent.
// When env.AI_GITHUB_MOCK === "1" (local dev/tests) it returns canned data
// instead of hitting api.github.com, so the full pipeline is testable offline.

import type { Env } from "../types";

const MOCK_SHA = "mock-sha-1234567";
const MOCK_DIFF = `diff --git a/src/checkout.ts b/src/checkout.ts
index 12f..a3c 100644
--- a/src/checkout.ts
+++ b/src/checkout.ts
@@ -10,6 +10,12 @@ export function applyDiscount(total: number, code: string): number {
   if (code === "WELCOME10") {
     return total * 0.9;
   }
+  // apply tiered discount
+  if (total > 5000) {
+    total = total * 0.85;
+  }
   return total;
 }
+
+export async function fetchOrder(id: string) {
+  const res = await fetch("https://api.shop.example/orders/" + id);
+  return res.json();
+}
diff --git a/src/auth.ts b/src/auth.ts
index b2c..d4e 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -3,4 +3,9 @@ export function isAdmin(user: { role?: string }) {
   return user.role === "admin";
 }
+
+export function login(email: string, password: string) {
+  const query = "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'";
+  return db.query(query);
+}
`;

export interface CommitInfo {
  sha: string;
  message: string;
}

export interface GhComment {
  html_url: string;
}

export async function getLatestCommit(
  env: Env,
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<CommitInfo> {
  if (env.AI_GITHUB_MOCK === "1") {
    return { sha: MOCK_SHA, message: "mock: add tiered discounts and login helper" };
  }
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=1`,
    { headers: { Authorization: `Bearer ${token}`, "User-Agent": "skillbridge-ai-agent", Accept: "application/vnd.github+json" } }
  );
  if (!res.ok) throw new Error(`GitHub commits: HTTP ${res.status}`);
  const data = (await res.json()) as { sha: string; commit: { message: string } }[];
  if (!data.length) throw new Error("No commits found on branch");
  return { sha: data[0].sha, message: data[0].commit.message.split("\n")[0] };
}

export async function getCommitDiff(
  env: Env,
  owner: string,
  repo: string,
  sha: string,
  token: string
): Promise<string> {
  if (env.AI_GITHUB_MOCK === "1") return MOCK_DIFF;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "skillbridge-ai-agent", Accept: "application/vnd.github.diff" },
  });
  if (!res.ok) throw new Error(`GitHub diff: HTTP ${res.status}`);
  return res.text();
}

export async function postCommitComment(
  env: Env,
  owner: string,
  repo: string,
  sha: string,
  body: string,
  token: string
): Promise<GhComment> {
  if (env.AI_GITHUB_MOCK === "1") {
    return { html_url: `https://github.com/${owner}/${repo}/commit/${sha}#review-comment` };
  }
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}/comments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "skillbridge-ai-agent", Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error(`GitHub comment: HTTP ${res.status}`);
  return (await res.json()) as GhComment;
}