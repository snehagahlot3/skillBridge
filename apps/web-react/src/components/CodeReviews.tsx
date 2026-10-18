import { useEffect, useState } from "react";
import { GitBranch, RefreshCw, Trash2 } from "lucide-react";
import { api, type AiRepo, type Job, type ReviewRun } from "../lib/api";
import { Stars } from "./ui";
import Md from "./Md";

export default function CodeReviews() {
  const [repos, setRepos] = useState<AiRepo[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ owner: "", repo: "", token: "", branch: "main", jobId: "" });
  const [formError, setFormError] = useState("");
  const [openRepo, setOpenRepo] = useState<string | null>(null);
  const [runs, setRuns] = useState<ReviewRun[]>([]);

  async function load() {
    try {
      const [repoList, jobs] = await Promise.all([api.aiGithubRepos(), api.getJobs({ mine: true })]);
      setRepos(repoList);
      setMyJobs(jobs);
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    setBusy(true);
    setFormError("");
    try {
      await api.aiGithubConnect({
        owner: form.owner,
        repo: form.repo,
        token: form.token,
        branch: form.branch || undefined,
        jobId: form.jobId || undefined,
      });
      setShowForm(false);
      setForm({ owner: "", repo: "", token: "", branch: "main", jobId: "" });
      setToast("Repo connected. Press 'Review latest' to run the first review.");
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reviewNow(repoId: string, scope: "latest" | "commits" | "repo" = "latest", count?: number) {
    setBusy(true);
    try {
      const run = await api.aiGithubReview(repoId, scope, count);
      if (run.status === "done") {
        setToast(`Review done — rating ${run.rating}/5. Summary stored and posted.`);
      } else {
        setToast("Review finished with warnings.");
      }
      await load();
      if (openRepo === repoId) await loadRuns(repoId);
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadRuns(repoId: string) {
    try {
      setRuns(await api.aiGithubRuns(repoId));
    } catch (err) {
      setToast((err as Error).message);
    }
  }

  async function remove(repoId: string) {
    if (!window.confirm("Disconnect this repo? Its review history will be deleted.")) return;
    setBusy(true);
    try {
      await api.aiGithubDelete(repoId);
      setOpenRepo(null);
      await load();
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-muted">Loading...</div>;

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h2 className="heading-title text-xl">AI Code Reviews</h2>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            Connect a GitHub repo — review the latest commit, recent commits or the whole repository.
            New commits are reviewed automatically every 15 minutes.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>Connect a repo</button>
      </div>

      {toast && (
        <div className="mb-6 rounded-[8px] border border-line bg-surface p-4 text-sm text-ink border-l-4 border-l-accent">
          {toast}
        </div>
      )}

      {showForm && (
        <div className="card p-6 mb-6">
          <h3 className="heading-card mb-4">Connect GitHub repository</h3>
          {formError && <div className="mb-4 rounded-[8px] border border-line bg-surface p-3 text-sm text-ink border-l-4 border-l-accent">{formError}</div>}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Owner / organisation</label>
                <input className="input" placeholder="snehagahlot3" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
              </div>
              <div>
                <label className="label">Repository</label>
                <input className="input" placeholder="skillBridge" value={form.repo} onChange={(e) => setForm({ ...form, repo: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">GitHub personal access token (repo scope)</label>
              <input type="password" className="input" placeholder="ghp_..." value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} />
              <p className="text-xs text-muted mt-1">Stored encrypted. Used only to read diffs and post review comments.</p>
            </div>
            <div>
              <label className="label">Branch to watch</label>
              <input className="input" placeholder="main" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
            </div>
            <div>
              <label className="label">Link to a job (optional — reviews appear in its progress timeline and get emailed)</label>
              <select className="input" value={form.jobId} onChange={(e) => setForm({ ...form, jobId: e.target.value })}>
                <option value="">No job link</option>
                {myJobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title} ({j.status})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" disabled={busy || !form.owner || !form.repo || form.token.length < 10} onClick={connect}>
                {busy ? "Connecting..." : "Connect"}
              </button>
              <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {repos.map((repo) => (
          <div key={repo.id} className="card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink inline-flex items-center gap-2 flex-wrap">
                  <GitBranch strokeWidth={1.5} className="w-4 h-4 text-muted" />
                  {repo.owner}/{repo.repo}
                  <span className="text-muted text-sm font-normal">({repo.branch})</span>
                  {repo.jobTitle && <span className="badge-lavender">↳ {repo.jobTitle}</span>}
                </p>
                {repo.lastRun ? (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={repo.lastRun.status === "done" ? "badge-verified" : "badge-draft"}>{repo.lastRun.status}</span>
                    {repo.lastRun.rating != null && <Stars value={repo.lastRun.rating} />}
                    {repo.lastRun.commitSha && <span className="text-xs text-muted font-mono">{repo.lastRun.commitSha.slice(0, 7)}</span>}
                  </div>
                ) : (
                  <p className="text-sm text-muted mt-1">No reviews yet.</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <button className="btn-primary text-sm" disabled={busy} onClick={() => reviewNow(repo.id, "latest")}>
                  <RefreshCw strokeWidth={1.5} className="w-4 h-4 text-white" /> Review latest
                </button>
                <button className="btn-secondary text-sm" disabled={busy} onClick={() => reviewNow(repo.id, "commits", 3)}>
                  Review 3 commits
                </button>
                <button className="btn-secondary text-sm" disabled={busy} onClick={() => reviewNow(repo.id, "repo")}>
                  Whole repo
                </button>
                <button
                  className="btn-ghost text-sm"
                  onClick={() => {
                    if (openRepo === repo.id) setOpenRepo(null);
                    else { setOpenRepo(repo.id); loadRuns(repo.id); }
                  }}
                >
                  History
                </button>
                <button className="btn-ghost text-sm text-accent hover:text-ink" disabled={busy} onClick={() => remove(repo.id)}>
                  <Trash2 strokeWidth={1.5} className="w-4 h-4" />
                </button>
              </div>
            </div>

            {openRepo === repo.id && (
              <div className="mt-4 pt-4 border-t border-line space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Review history</p>
                {runs.length === 0 && <p className="text-sm text-muted">No runs yet.</p>}
                {runs.map((run) => (
                  <div key={run.id} className="rounded-[8px] border border-line bg-bg/50 p-3.5">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted">
                      <span className="font-mono">{run.commitSha.slice(0, 7) || "—"}</span>
                      <span>{run.commitMessage}</span>
                      <span className="badge-draft">{run.status}</span>
                      {run.rating != null && <Stars value={run.rating} />}
                      {run.commentUrl && (
                        <a href={run.commentUrl} target="_blank" rel="noreferrer" className="text-accent hover:text-ink hover:underline ml-auto">
                          View on GitHub
                        </a>
                      )}
                    </div>
                    {run.summary && <Md text={run.summary} className="mt-2 text-muted" />}
                    {run.findings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {run.findings.slice(0, 5).map((f, i) => (
                          <p key={i} className="text-xs text-muted">
                            <span className="font-medium text-accent">[{f.severity}]</span>{" "}
                            <span className="font-mono">{f.file}{f.line ? `:${f.line}` : ""}</span> — {f.issue}
                          </p>
                        ))}
                        {run.findings.length > 5 && (
                          <p className="text-xs text-muted">+{run.findings.length - 5} more findings</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {repos.length === 0 && (
          <div className="card p-10 text-center text-muted">
            No repos connected yet. Connect one and the AI agent will review new commits automatically (every 15 minutes).
          </div>
        )}
      </div>
    </>
  );
}