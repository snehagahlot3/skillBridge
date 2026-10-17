import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { api, budgetLabel, type JobUpdate, type MentorJob, type Milestone } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Modal, StatusBadge } from "../components/ui";

type Selected = MentorJob & { milestones: Milestone[]; updates: JobUpdate[]; applications: any[] };

export default function MentorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<"queue" | "mine">("queue");
  const [queue, setQueue] = useState<MentorJob[]>([]);
  const [mine, setMine] = useState<MentorJob[]>([]);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    try {
      const [q, m] = await Promise.all([api.getMentorQueue(), api.getMentorJobs()]);
      setQueue(q);
      setMine(m);
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function claim(jobId: string) {
    setBusy(true);
    try {
      await api.claimJob(jobId);
      setToast("You are now mentoring this job.");
      await loadAll();
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function release(jobId: string) {
    setBusy(true);
    try {
      await api.releaseJob(jobId);
      setToast("You stepped down as mentor. The job is back in the queue.");
      await loadAll();
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function openJob(jobId: string) {
    try {
      const data = await api.getMentorJob(jobId);
      setSelected(data as Selected);
    } catch (err) {
      setToast((err as Error).message);
    }
  }

  function signOut() {
    logout();
    navigate("/");
  }

  if (loading) return <div className="p-8 text-center text-muted">Loading...</div>;

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <header className="border-b border-line bg-surface sticky top-0 z-40">
        <div className="mx-auto max-w-[1120px] w-full px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-serif text-[22px] font-semibold text-ink tracking-tight hover:opacity-95">
            SkillBridge — Mentor Panel
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">{user?.name}</span>
            <button onClick={signOut} className="btn-ghost text-sm">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] w-full px-6 py-8 flex-1">
        <nav className="flex items-center gap-6 overflow-x-auto border-b border-line mb-8 pb-0 scrollbar-none whitespace-nowrap" aria-label="Mentor Navigation">
          <button
            type="button"
            onClick={() => setTab("queue")}
            className={`relative pb-3 pt-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm ${
              tab === "queue"
                ? "text-ink font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-butter"
                : "text-muted hover:text-ink"
            }`}
          >
            Live jobs to mentor ({queue.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("mine")}
            className={`relative pb-3 pt-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm ${
              tab === "mine"
                ? "text-ink font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-butter"
                : "text-muted hover:text-ink"
            }`}
          >
            My jobs ({mine.length})
          </button>
        </nav>

        {toast && (
          <div className="mb-6 rounded-[8px] border border-line bg-surface p-4 text-sm text-ink border-l-4 border-l-accent">
            {toast}
          </div>
        )}

        {tab === "queue" && (
          <div className="grid gap-4">
            {queue.map((job) => (
              <div key={job.id} className="card p-6 flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <h3 className="heading-card">{job.title}</h3>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    {job.description.slice(0, 140)}{job.description.length > 140 ? "…" : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="badge-budget">{budgetLabel(job)}</span>
                    <StatusBadge status={job.status} />
                    <span className="badge-skill">Owner: {job.ownerName}</span>
                    {job.teamNames?.length > 0 && (
                      <span className="badge-lavender">
                        Team: {job.teamNames.map((t) => t.name).join(", ")}
                      </span>
                    )}
                    <span className="badge-lavender">{job.applicationCount} quotes</span>
                  </div>
                </div>
                <div className="shrink-0 pt-1">
                  <button onClick={() => claim(job.id)} className="btn-primary shrink-0" disabled={busy}>
                    Claim this job
                  </button>
                </div>
              </div>
            ))}
            {queue.length === 0 && (
              <div className="empty-state">No live jobs waiting for a mentor right now.</div>
            )}
          </div>
        )}

        {tab === "mine" && (
          <div className="grid gap-4">
            {mine.map((job) => (
              <div key={job.id} className="card p-6 flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <h3 className="heading-card">{job.title}</h3>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <StatusBadge status={job.status} />
                    <span className="badge-skill">Owner: {job.ownerName}</span>
                    {job.teamNames?.length > 0 && (
                      <span className="badge-lavender">
                        Team: {job.teamNames.map((t) => t.name).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 pt-1 flex-wrap">
                  <Link to={`/chat/${job.id}`} className="btn-secondary text-xs py-1.5 gap-1">
                    <MessageCircle strokeWidth={1.5} className="w-3.5 h-3.5 text-ink" /> Group
                  </Link>
                  <Link to={`/chat/${job.id}?scope=mentor`} className="btn-secondary text-xs py-1.5 gap-1">
                    <MessageCircle strokeWidth={1.5} className="w-3.5 h-3.5 text-ink" /> Student chat
                  </Link>
                  <button onClick={() => openJob(job.id)} className="btn-primary text-xs py-1.5">
                    Progress
                  </button>
                  <button onClick={() => release(job.id)} className="btn-ghost text-xs py-1.5" disabled={busy}>
                    Free myself
                  </button>
                </div>
              </div>
            ))}
            {mine.length === 0 && (
              <div className="empty-state">You aren't mentoring any jobs yet. Claim one from the queue!</div>
            )}
          </div>
        )}
      </main>

      {selected && (
        <MentorJobModal
          job={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            openJob(selected.id);
            loadAll();
          }}
          onError={setToast}
        />
      )}
    </div>
  );
}

function MentorJobModal({ job, onClose, onChanged, onError }: {
  job: Selected;
  onClose: () => void;
  onChanged: () => void;
  onError: (m: string) => void;
}) {
  const [revising, setRevising] = useState<Milestone | null>(null);
  const [content, setContent] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [gateValue, setGateValue] = useState(job.aiGateThreshold != null ? String(job.aiGateThreshold) : "");

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try {
      await fn();
      onError(msg);
      setRevising(null);
      setContent("");
      onChanged();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function setGate(value: string) {
    setBusy(true);
    try {
      const threshold = value ? Number(value) : null;
      await api.mentorAiGate(job.id, threshold);
      onError(threshold == null ? "AI review gate disabled." : `AI review gate set to ${threshold}/5.`);
      onChanged();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={job.title} onClose={onClose} wide>
      <div className="space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={job.status} />
          <span className="badge-budget">{budgetLabel(job)}</span>
          <span className="badge-skill">Owner: {job.ownerName}</span>
          {job.teamNames?.length > 0 && (
            <span className="badge-lavender">
              Team: {job.teamNames.map((t) => `${t.name} (${t.positionTitle})`).join(", ")}
            </span>
          )}
        </div>

        <section>
          <h4 className="heading-card text-base mb-3">Milestones</h4>
          <div className="space-y-2.5">
            {job.milestones.map((m) => (
              <div key={m.id} className="flex items-center justify-between flex-wrap gap-2 rounded-[8px] border border-line bg-bg/50 p-3.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${m.status === "approved" ? "bg-butter border border-ink" : m.status === "submitted" ? "bg-lavender" : "bg-line"}`} />
                  <span className="font-medium text-ink">{m.title}</span>
                  <span className="badge-draft text-xs">{m.status}</span>
                </div>
                {m.status === "submitted" && (
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary text-xs py-1.5" disabled={busy} onClick={() => run(() => api.approveMilestone(m.id), "Milestone approved.")}>
                      Approve
                    </button>
                    <button type="button" className="btn-secondary text-xs py-1.5" onClick={() => { setRevising(m); setContent(""); }}>
                      Request revision
                    </button>
                  </div>
                )}
              </div>
            ))}
            {job.milestones.length === 0 && <p className="text-sm text-muted">No milestones yet.</p>}
          </div>
        </section>

        <section>
          <h4 className="heading-card text-base mb-3">Progress timeline</h4>
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {job.updates.map((u) => (
              <div key={u.id} className="rounded-[8px] border border-line bg-surface p-3">
                <p className="text-xs text-muted">{u.authorName} · {u.authorRole} · {new Date(u.createdAt + "Z").toLocaleString()}</p>
                <p className="text-sm text-ink mt-1 leading-relaxed">{u.content}</p>
              </div>
            ))}
            {job.updates.length === 0 && <p className="text-sm text-muted">No updates yet.</p>}
          </div>
          <div className="flex gap-2 mt-4 pt-2 border-t border-line">
            <input className="input" placeholder="Comment or guidance..." value={comment} onChange={(e) => setComment(e.target.value)} />
            <button
              type="button"
              className="btn-primary shrink-0"
              disabled={busy || comment.trim().length < 1}
              onClick={() => run(async () => { await api.postJobUpdate(job.id, comment.trim()); setComment(""); }, "Comment posted.")}
            >
              Post
            </button>
          </div>
        </section>

        <section className="flex items-center gap-3 pt-3 border-t border-line">
          <Link to={`/chat/${job.id}`} className="btn-secondary gap-1.5">
            <MessageCircle strokeWidth={1.5} className="w-4 h-4 text-ink" /> Open chat (owner ↔ talent)
          </Link>
          <Link to={`/jobs/${job.id}`} className="btn-ghost">Full job page</Link>
        </section>

        <section className="border-t pt-4">
          <h4 className="font-semibold text-sm text-gray-700 mb-2">AI review gate</h4>
          <p className="text-xs text-gray-500 mb-2">
            Require a passing AI code review before the FINAL milestone can be approved.
          </p>
          <div className="flex items-center gap-2">
            <select className="input max-w-xs" value={gateValue} onChange={(e) => { setGateValue(e.target.value); setGate(e.target.value); }}>
              <option value="">Off</option>
              <option value="3">Require ≥ 3/5</option>
              <option value="4">Require ≥ 4/5</option>
              <option value="5">Require ≥ 5/5</option>
            </select>
            {job.aiGateThreshold != null && (
              <span className="badge bg-brand-50 text-brand-700">final milestone gated at {job.aiGateThreshold}/5</span>
            )}
          </div>
        </section>
      </div>

      {revising && (
        <Modal title={`Request revision — ${revising.title}`} onClose={() => setRevising(null)}>
          <label className="label">What needs to change?</label>
          <textarea className="input" rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
          <button
            type="button"
            className="btn-primary mt-4"
            disabled={busy || content.trim().length < 5}
            onClick={() => run(() => api.revisionMilestone(revising.id, content.trim()), "Revision requested.")}
          >
            Send
          </button>
        </Modal>
      )}
    </Modal>
  );
}