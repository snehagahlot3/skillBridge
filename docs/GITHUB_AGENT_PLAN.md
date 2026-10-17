# GitHub Code-Review Agent — Implementation Plan

SkillBridge's "GitHub Agent" reviews code on connected repositories and posts
findings as GitHub comments. This plan maps the proven concepts from the local
`Cream` project (D:\projects\Cream) onto SkillBridge's Cloudflare stack
(Hono worker + D1 + Durable Objects + Workers AI), keeping **all AI features on
the same `/api/ai` surface**.

## What Cream does today (reference architecture)

- **PollingSync** (`github/polling_sync.py`): polls matching branches every N
  seconds, diffs new commits against last-seen SHAs, fires callbacks.
- **GitHubClient + DiffAnalyzer** (`github/`): fetches commit diffs, changed
  files, per-language stats, and file contents at a SHA.
- **DebateEngine** (`models/debate_engine.py`): sends code+diff to multiple LLM
  providers, runs debate rounds until models agree, produces a master report.
- **ReviewOrchestrator** (`review/orchestrator.py`): new-commit event -> fetch
  diff -> build review context -> conduct review -> rating + fixes summary.
- **FixGenerator / ApprovalWorkflow / Rating** (`review/`): generates fixes,
  gates merges by approval mode, scores the commit.
- **Notifications**: Slack/email/pagerduty dispatchers.

## Mapping onto SkillBridge

| Cream concept | SkillBridge equivalent |
|---|---|
| Repo polling | Cloudflare **Cron Trigger** on the worker (`crons = ["*/5 * * * *"]`) — free tier supports cron. Optionally GitHub webhooks later. |
| GitHubClient | `fetch` to the GitHub REST API from the worker (`Accept: application/vnd.github.diff` for commit/PR diffs). |
| Commit tracking | New D1 table `ai_repos` (repo, branch, last_reviewed_sha). |
| DebateEngine (multi-model) | Workers AI single-model review + optional second pass as "critic". Multi-model debate is a Phase 3 nice-to-have. |
| Orchestrator | New `review_runs` D1 table + a Durable Object `ReviewRun` for long-running/queued reviews (AI calls may exceed free-tier CPU limits). |
| Rating/fixes | Same review prompt returns JSON `{summary, rating, findings[], suggestedFixes[]}`; posted as a GitHub PR review/commit comment. |
| Approval workflow | MVP: review comment only. Phase 2: `@skillbridge approve` / `@skillbridge request-changes` commands parsed from PR comments. |

## Data model (D1)

```
ai_repos (
  id, user_id -> users, owner, repo, default_branch, branch_pattern,
  status (active|paused), token_env_key, last_reviewed_sha, created_at
)
review_runs (
  id, repo_id, commit_sha, pr_number, status (queued|running|done|failed),
  summary, rating, findings (JSON), suggested_fixes (JSON),
  github_comment_url, tokens_used, created_at
)
```

## Endpoints (all under `/api/ai/github/*`, auth: owner of the repo link + admin)

- `POST /api/ai/github/repos` — connect a repo: `{owner, repo, token}`. Token
  is **encrypted** with an AES-GCM key derived from `JWT_SECRET` and stored in
  D1; the plaintext is never logged.
- `GET /api/ai/github/repos` — my repos + last review status.
- `POST /api/ai/github/repos/:id/review` — manual review of the latest commit
  on the default branch (MVP "Review now" button).
- `POST /api/ai/github/repos/:id/pr/:number/review` — review a specific PR
  (Phase 2).
- `DELETE /api/ai/github/repos/:id` — disconnect.
- Webhook/cron: worker cron handler diffs each active repo's branch against
  `last_reviewed_sha`, enqueues new commits.

## Review pipeline (per commit)

1. Fetch diff: `GET /repos/{owner}/{repo}/commits/{sha}` with the diff media
   type; cap at ~300 changed files.
2. **Chunk the diff** (~4k tokens per chunk). Workers AI context limits make
   whole-PR reviews unsafe — review per file-group.
3. For each chunk, one AI call with the review prompt:

   ```
   You are a senior code reviewer. Review this diff and respond with ONLY JSON:
   {"summary": "...", "rating": 1-5, "findings": [
     {"file": "...", "line": n, "severity": "critical|high|medium|low",
      "issue": "...", "suggestion": "..."}
   ], "suggestedFixes": ["..."]}
   Diff: {chunk}
   ```

4. Aggregate chunks into one report; compute rating (weighted by severity,
   mirroring `review/rating.py`).
5. Post as a GitHub **commit comment** (MVP) / **PR review with inline
   comments** (Phase 2, needs PR + file + line info).
6. Persist `review_runs` row; publish the report to the job's chat/updates if
   the repo is linked to a SkillBridge job (nice cross-feature tie-in).

## Free-tier budget notes

- Workers AI free tier ≈ 10k neurons/day; a medium PR review of ~5 chunks ×
  700 output tokens ≈ a few thousand neurons. Cap reviews per repo per day
  (e.g. max 3) and record `tokens_used`.
- Long reviews may exceed the 10ms CPU per request — offload the pipeline to
  a **Durable Object** (`ReviewRun`) or use `ctx.waitUntil` so the cron tick
  returns immediately.
- Paid plan / startup credits only as overflow: raise the daily review cap
  instead of failing.

## UI (web-react)

- New "Repos" section (user dashboard): connect GitHub repo (owner/repo/token
  form), list repos with last-reviewed SHA + status, "Review now" button.
- Review result view: rating, findings by severity, suggested fixes, link to
  the GitHub comment.
- Optional: link a repo to a job so reviews land in that job's progress
  timeline (mentor sees code quality alongside milestones).

## Phases

1. **MVP**: repo connect (encrypted token), cron polling of default branch,
   diff -> chunk -> single-model review -> commit comment -> D1 history + UI.
2. **PR reviews**: webhook on pull_request, inline review comments on the
   diff, `@skillbridge approve/reject` commands, fix suggestions posted as
   follow-up comments.
3. **Debate/critic pass + multi-model**: second Workers AI model critiques the
   first report (Cream's debate engine, simplified).
4. **Mentor integration**: review reports appear in job progress timelines;
   mentors can require a passing review before approving final delivery.