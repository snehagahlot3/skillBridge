// GitHub REST client for the code-review agent.
// When env.AI_GITHUB_MOCK === "1" (local dev/tests) it returns canned data
// instead of hitting api.github.com, so the full pipeline is testable offline.

import type { Env } from "../types";

const MOCK_SHA = "mock-sha-1234567";
const MOCK_DIFF = `diff --git a/src/pricing.ts b/src/pricing.ts
index 12f..a3c 100644
--- a/src/pricing.ts
+++ b/src/pricing.ts
@@ -5,4 +5,8 @@ export function calculatePrice(items) {
   let total = 0;
   for (const item of items) {
+    // apply volume discount
+    if (total > 1000) {
+      total = total * 0.9;
+    }
     total += item.price * item.quantity;
   }
   return total;
 }
+
+export function formatPrice(price) {
+  if (price == undefined) return "N/A";
+  return "$" + price;
+}
diff --git a/src/cart.ts b/src/cart.ts
index b2c..d4e 100644
--- a/src/cart.ts
+++ b/src/cart.ts
@@ -3,4 +3,9 @@ export function addItem(cart, item) {
   cart.items.push(item);
   return cart;
 }
+
+export function getCartTotal(cart) {
+  let sum = 0;
+  for (const item of cart.items) {
+    sum += item.price * item.qty;
+  }
+  return sum;
+}
`;

export interface CommitInfo {
  sha: string;
  message: string;
}

export interface GhComment {
  html_url: string;
}

export interface GhUser {
  login: string;
}

export interface GhPullRequest {
  number: number;
  title: string;
  html_url: string;
  head: { sha: string; ref: string };
  base: { ref: string };
  user: { login: string };
}

const MOCK_PR: GhPullRequest = {
  number: 7,
  title: "mock: add checkout discount tiers",
  html_url: "https://github.com/testorg/testrepo/pull/7",
  head: { sha: "mock-pr-sha-abcdef", ref: "feature/discount" },
  base: { ref: "main" },
  user: { login: "mock-owner" },
};

export async function getAuthenticatedUser(env: Env, token: string): Promise<GhUser> {
  if (env.AI_GITHUB_MOCK === "1") return { login: "mock-owner" };
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "skillbridge-ai-agent", Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub user: HTTP ${res.status}`);
  return (await res.json()) as GhUser;
}

export async function getPullRequest(
  env: Env,
  owner: string,
  repo: string,
  prNumber: number,
  token: string
): Promise<GhPullRequest> {
  if (env.AI_GITHUB_MOCK === "1") return MOCK_PR;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "skillbridge-ai-agent", Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub PR: HTTP ${res.status}`);
  return (await res.json()) as GhPullRequest;
}

export async function getPrDiff(
  env: Env,
  owner: string,
  repo: string,
  prNumber: number,
  token: string
): Promise<string> {
  if (env.AI_GITHUB_MOCK === "1") return MOCK_DIFF;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "skillbridge-ai-agent", Accept: "application/vnd.github.diff" },
  });
  if (!res.ok) throw new Error(`GitHub PR diff: HTTP ${res.status}`);
  return res.text();
}

export async function postPrReviewComment(
  env: Env,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
  token: string
): Promise<GhComment> {
  if (env.AI_GITHUB_MOCK === "1") {
    return { html_url: `https://github.com/${owner}/${repo}/pull/${prNumber}#review` };
  }
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "skillbridge-ai-agent", Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ event: "COMMENT", body }),
  });
  if (!res.ok) throw new Error(`GitHub PR review: HTTP ${res.status}`);
  return (await res.json()) as GhComment;
}

export async function postPrInlineComment(
  env: Env,
  owner: string,
  repo: string,
  prNumber: number,
  commitId: string,
  file: string,
  line: number,
  body: string,
  token: string
): Promise<GhComment> {
  if (env.AI_GITHUB_MOCK === "1") {
    return { html_url: `https://github.com/${owner}/${repo}/pull/${prNumber}#discussion_r` };
  }
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/comments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "skillbridge-ai-agent", Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ body, commit_id: commitId, path: file, line, side: "RIGHT" }),
  });
  if (!res.ok) throw new Error(`GitHub inline comment: HTTP ${res.status}`);
  return (await res.json()) as GhComment;
}

export async function postPrFormalReview(
  env: Env,
  owner: string,
  repo: string,
  prNumber: number,
  event: "APPROVE" | "REQUEST_CHANGES",
  body: string,
  token: string
): Promise<{ state: string; html_url: string }> {
  if (env.AI_GITHUB_MOCK === "1") {
    return { state: event, html_url: `https://github.com/${owner}/${repo}/pull/${prNumber}#review` };
  }
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "skillbridge-ai-agent", Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ event, body }),
  });
  if (!res.ok) throw new Error(`GitHub formal review: HTTP ${res.status}`);
  return (await res.json()) as { state: string; html_url: string };
}

const MOCK_COMMITS: CommitInfo[] = [
  { sha: "mock-commit-aaaaaaa", message: "mock: add volume discount logic" },
  { sha: "mock-commit-bbbbbbb", message: "mock: add price formatting helper" },
  { sha: "mock-commit-ccccccc", message: "mock: add cart total helper" },
];

const MOCK_COMMIT_DIFFS: Record<string, string> = {
  "mock-commit-aaaaaaa": MOCK_DIFF,
  "mock-commit-bbbbbbb": `diff --git a/src/format.ts b/src/format.ts
--- a/src/format.ts
+++ b/src/format.ts
@@ -1,3 +1,8 @@
+export function formatPrice(price) {
+  if (price == undefined) return "N/A";
+  return "$" + price;
+}
`,
  "mock-commit-ccccccc": `diff --git a/src/cart.ts b/src/cart.ts
--- a/src/cart.ts
+++ b/src/cart.ts
@@ -1,3 +1,9 @@
+export function getCartTotal(cart) {
+  let sum = 0;
+  for (const item of cart.items) {
+    sum += item.price * item.qty;
+  }
+  return sum;
+}
`,
};

export async function getRecentCommits(
  env: Env,
  owner: string,
  repo: string,
  branch: string,
  count: number,
  token: string
): Promise<CommitInfo[]> {
  if (env.AI_GITHUB_MOCK === "1") return MOCK_COMMITS.slice(0, count);
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${count}`,
    { headers: { Authorization: `Bearer ${token}`, "User-Agent": "skillbridge-ai-agent", Accept: "application/vnd.github+json" } }
  );
  if (!res.ok) throw new Error(`GitHub commits: HTTP ${res.status}`);
  const data = (await res.json()) as { sha: string; commit: { message: string } }[];
  return data.map((c) => ({ sha: c.sha, message: c.commit.message.split("\n")[0] }));
}

export async function getCommitDiffForSha(
  env: Env,
  owner: string,
  repo: string,
  sha: string,
  token: string
): Promise<string> {
  if (env.AI_GITHUB_MOCK === "1") return MOCK_COMMIT_DIFFS[sha] ?? MOCK_DIFF;
  return getCommitDiff(env, owner, repo, sha, token);
}

export interface RepoFile {
  path: string;
  content: string;
}

const MOCK_REPO_FILES: RepoFile[] = [
  { path: "package.json", content: '{\n  "name": "mock-app",\n  "scripts": { "start": "node src/index.js" }\n}\n' },
  { path: "src/pricing.ts", content: "export function calculatePrice(items) {\n  let total = 0;\n  for (const item of items) {\n    if (total > 1000) { total = total * 0.9; }\n    total += item.price * item.quantity;\n  }\n  return total;\n}\n" },
  { path: "src/cart.ts", content: "export function getCartTotal(cart) {\n  let sum = 0;\n  for (const item of cart.items) { sum += item.price * item.qty; }\n  return sum;\n}\n" },
];

export async function getRepoTree(
  env: Env,
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<RepoFile[]> {
  if (env.AI_GITHUB_MOCK === "1") return MOCK_REPO_FILES;
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: { Authorization: `Bearer ${token}`, "User-Agent": "skillbridge-ai-agent", Accept: "application/vnd.github+json" } }
  );
  if (!res.ok) throw new Error(`GitHub tree: HTTP ${res.status}`);
  const data = (await res.json()) as { tree?: { path: string; type: string; size?: number }[] };
  const files = (data.tree ?? [])
    .filter((t) => t.type === "blob" && (t.size ?? 0) < 100_000)
    .slice(0, 200);
  const out: RepoFile[] = [];
  for (const f of files) {
    const raw = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodeURIComponent(f.path)}`,
      { headers: { Authorization: `Bearer ${token}`, "User-Agent": "skillbridge-ai-agent" } }
    );
    if (!raw.ok) continue;
    out.push({ path: f.path, content: (await raw.text()).slice(0, 30_000) });
  }
  return out;
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