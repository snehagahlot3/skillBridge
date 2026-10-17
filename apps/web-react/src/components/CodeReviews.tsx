import { useEffect, useState } from "react";
import { GitBranch, RefreshCw, Trash2 } from "lucide-react";
import { api, type AiRepo, type ReviewRun } from "../lib/api";
import { Stars } from "./ui";

export default function CodeReviews() {
  const [repos, setRepos] = useState<AiRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ owner: "", repo: "", token: "", branch: "main" });
  const [formError, setFormError] = useState("");
  const [openRepo, setOpenRepo] = useState<string | null>(null);
  const [runs, setRuns] = useState<ReviewRun[]>([]);

  async function load() {
    try {
      setRepos(await api.aiGithubRepos());
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
      await api.aiGithubConnect({ owner: form.owner, repo: form.repo, token: form.token, branch: form.branch || undefined });
      setShowForm(false);
      setForm({ owner: "", repo: "", token: "", branch: "main" });
      setToast("Repo connected. Press 'Review now' to run the first review.");
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reviewNow(repoId: string) {
    setBusy(true);
    try {
      const run = await api.aiGithubReview(repoId);
      if (run.status === "done") {
        setToast(`Review done — rating ${run.rating}/5. Posted to GitHub.`);
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

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">AI Code Reviews</h2>
          <p className="text-sm text-gray-500 mt-1">
            Connect a GitHub repo — every new commit is reviewed by the AI agent and the report is posted as a commit comment.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>Connect a repo</button>
      </div>

      {toast && <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">{toast}</div>}

      {showForm && (
        <div className="card mb-6">
          <h3 className="font-semibold text-lg mb-4">Connect GitHub repository</h3>
          {formError && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
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
              <p className="text-xs text-gray-400 mt-1">Stored encrypted. Used only to read diffs and post review comments.</p>
            </div>
            <div>
              <label className="label">Branch to watch</label>
              <input className="input" placeholder="main" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
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
          <div key={repo.id} className="card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold inline-flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-gray-400" />
                  {repo.owner}/{repo.repo}
                  <span className="text-sm text-gray-500 font-normal">({repo.branch})</span>
                </p>
                {repo.lastRun ? (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`badge ${repo.lastRun.status === "done" ? "badge-verified" : "badge-pending"}`}>{repo.lastRun.status}</span>
                    {repo.lastRun.rating != null && <Stars value={repo.lastRun.rating} />}
                    {repo.lastRun.commitSha && <span className="text-xs text-gray-400">{repo.lastRun.commitSha.slice(0, 7)}</span>}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">No reviews yet.</p>
                )}
              </div>
              <div className="flex gap-2">
                <button className="btn-primary text-sm" disabled={busy} onClick={() => reviewNow(repo.id)}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Review now
                </button>
                <button
                  className="btn-secondary text-sm"
                  onClick={() => {
                    if (openRepo === repo.id) setOpenRepo(null);
                    else { setOpenRepo(repo.id); loadRuns(repo.id); }
                  }}
                >
                  History
                </button>
                <button className="btn-ghost text-sm text-red-600" disabled={busy} onClick={() => remove(repo.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {openRepo === repo.id && (
              <div className="mt-4 border-t pt-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">Review history</p>
                {runs.length === 0 && <p className="text-sm text-gray-500">No runs yet.</p>}
                {runs.map((run) => (
                  <div key={run.id} className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono">{run.commitSha.slice(0, 7) || "—"}</span>
                      <span className="text-xs text-gray-500">{run.commitMessage}</span>
                      <span className={`badge ${run.status === "done" ? "badge-verified" : "badge-pending"}`}>{run.status}</span>
                      {run.rating != null && <Stars value={run.rating} />}
                      {run.commentUrl && (
                        <a href={run.commentUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline ml-auto">
                          View on GitHub
                        </a>
                      )}
                    </div>
                    {run.summary && <p className="text-sm text-gray-600 mt-2">{run.summary}</p>}
                    {run.findings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {run.findings.slice(0, 5).map((f, i) => (
                          <p key={i} className="text-xs text-gray-600">
                            <span className="font-medium text-red-600">[{f.severity}]</span>{" "}
                            <span className="font-mono">{f.file}{f.line ? `:${f.line}` : ""}</span> — {f.issue}
                          </p>
                        ))}
                        {run.findings.length > 5 && (
                          <p className="text-xs text-gray-400">+{run.findings.length - 5} more findings</p>
                        )}
                      </div>
                    )}
                    {run.suggestedFixes.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700">Suggested fixes</p>
                        {run.suggestedFixes.slice(0, 3).map((s, i) => (
                          <p key={i} className="text-xs text-gray-600">• {s}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {repos.length === 0 && (
          <div className="card text-center text-gray-500">
            No repos connected yet. Connect one and the AI agent will review new commits automatically (every 15 minutes).
          </div>
        )}
      </div>
    </>
  );
}