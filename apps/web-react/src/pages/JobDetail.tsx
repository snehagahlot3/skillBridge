import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileText, Github, Globe, Linkedin, MessageCircle } from "lucide-react";
import {
  api,
  budgetLabel,
  type Application,
  type Job,
  type JobPosition,
  type JobUpdate,
  type Milestone,
  type TeamMember,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Modal, RatingInput, Stars, StatusBadge } from "../components/ui";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [updates, setUpdates] = useState<JobUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api.getJob(id as string);
      setJob(data);
      await loadUpdates(id as string);
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadUpdates(jobId: string) {
    try {
      setUpdates(await api.getJobUpdates(jobId));
    } catch {
      setUpdates([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(fn: () => Promise<unknown>, success?: string) {
    setBusy(true);
    try {
      await fn();
      if (success) setToast(success);
      await load();
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (!job) return <div className="p-8">Job not found.</div>;

  const isOwner = job.myRole === "owner";
  const isTeam = job.myRole === "team";
  const isMentor = job.myRole === "mentor";
  const isParticipant = !!job.myRole;
  const team = job.team ?? [];
  const fill = (p: JobPosition) => team.filter((t) => t.positionId === p.id).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">SkillBridge</h1>
          <div className="flex items-center gap-2">
            {isParticipant && (
              <Link to={`/chat/${job.id}`} className="btn-secondary text-sm">
                <MessageCircle className="w-4 h-4 mr-1" /> Group chat
              </Link>
            )}
            <button onClick={() => navigate(-1)} className="btn-ghost">Back</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {toast && <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">{toast}</div>}

        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{job.title}</h2>
              <p className="text-gray-600 mt-2">{job.description}</p>
            </div>
            <StatusBadge status={job.status} />
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            <span className="badge bg-brand-50 text-brand-700">{budgetLabel(job)}</span>
            <span className="badge bg-gray-100 text-gray-700">{job.category}</span>
            {job.deadline && <span className="badge bg-gray-100 text-gray-700">Due {job.deadline}</span>}
            {job.status === "open" && job.applicationCount != null && (
              <span className="badge bg-blue-50 text-blue-700">{job.applicationCount} quote{job.applicationCount === 1 ? "" : "s"}</span>
            )}
          </div>

          {job.owner && (
            <div className="mt-4 flex items-center gap-3 text-sm">
              <span className="text-gray-500">Posted by</span>
              <Link to={`/users/${job.owner.id}`} className="font-medium text-brand-600 hover:underline">
                {job.owner.businessName || job.owner.name}
              </Link>
              {job.owner.verificationStatus === "verified" && <span className="badge-verified">Verified business</span>}
            </div>
          )}

          {job.mentor && (
            <div className="mt-2 text-sm text-gray-600">
              Mentor: <span className="font-medium">{job.mentor.name}</span>
            </div>
          )}

          {job.positions?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Team needed</p>
              <div className="space-y-1.5">
                {job.positions.map((p) => {
                  const filled = fill(p);
                  return (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <span className="w-44 shrink-0 text-gray-700">{p.title}</span>
                      <div className="flex-1 h-2 rounded bg-gray-100 overflow-hidden">
                        <div className="h-2 rounded bg-brand-500" style={{ width: `${(filled / p.count) * 100}%` }} />
                      </div>
                      <span className="text-gray-500 w-24 text-right">{filled}/{p.count} hired</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {job.requiredSkills?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Required skills</p>
              <div className="flex flex-wrap gap-1">
                {job.requiredSkills.map((skill) => (
                  <span key={skill} className="badge bg-gray-100 text-gray-700">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {job.acceptanceCriteria && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-medium text-gray-700 mb-1">Acceptance criteria</p>
              <p className="text-gray-600">{job.acceptanceCriteria}</p>
            </div>
          )}
        </div>

        {team.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-lg mb-4">Team</h3>
            <div className="flex flex-wrap gap-2">
              {team.map((m) => (
                <Link key={m.id} to={`/users/${m.userId}`} className="badge bg-brand-50 text-brand-700 hover:underline">
                  {m.name} — {m.positionTitle}
                </Link>
              ))}
            </div>
          </div>
        )}

        {job.status === "open" && !isOwner && !isTeam && (
          <ProposalBox job={job} meId={user?.id} onChanged={() => load()} />
        )}

        {(isOwner || isMentor) && (job.applications?.length ?? 0) > 0 && (
          <QuotesSection job={job} team={team} onChanged={load} onError={setToast} />
        )}

        <ActionsBar job={job} busy={busy} onAct={act} />

        {isParticipant && (
          <MilestonesSection
            job={job}
            isOwner={isOwner}
            isTeam={isTeam}
            isMentor={isMentor}
            onChanged={load}
            onError={setToast}
          />
        )}

        {isParticipant && (
          <UpdatesSection jobId={job.id} updates={updates} onPosted={() => loadUpdates(job.id)} onError={setToast} />
        )}

        {job.status === "completed" && (
          <ReviewsSection job={job} team={team} me={user} onChanged={load} onError={setToast} />
        )}
      </main>
    </div>
  );
}

function ProposalBox({ job, meId, onChanged }: { job: Job; meId?: string; onChanged: () => Promise<void> }) {
  const myApps = (job.applications ?? []).filter((a) => a.applicantId === meId);
  const team = job.team ?? [];
  const [editing, setEditing] = useState<Application | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pitch, setPitch] = useState("");
  const [quote, setQuote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (myApps.length === 0) {
    return <QuoteBox job={job} team={team} onDone={() => onChanged()} />;
  }

  function startEdit(app: Application) {
    setEditing(app);
    setPitch(app.pitch);
    setQuote(app.quoteAmount != null ? String(app.quoteAmount) : "");
    setError("");
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const amount = Number(quote);
      if (!pitch.trim() || pitch.trim().length < 10) throw new Error("Tell the owner your plan in at least 10 characters.");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter your quote amount in ₹.");
      await api.updateApplication(editing.id, pitch.trim(), amount);
      setEditing(null);
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-lg mb-1">Proposal submitted</h3>
      <p className="text-xs text-gray-500 mb-4">You can view or update it while the job is still open.</p>
      <div className="space-y-3">
        {myApps.map((a) => (
          <div key={a.id} className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{a.positionTitle || "Position"}</span>
                <span className={`badge ${a.status === "pending" ? "badge-pending" : a.status === "accepted" ? "badge-verified" : "bg-gray-100 text-gray-500"}`}>{a.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge bg-brand-50 text-brand-700 font-semibold">₹{a.quoteAmount?.toLocaleString("en-IN")}</span>
                <button className="btn-secondary text-xs py-1.5" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                  {expanded === a.id ? "Hide" : "View proposal"}
                </button>
                {a.status === "pending" && (
                  <button className="btn-primary text-xs py-1.5" onClick={() => startEdit(a)}>Edit</button>
                )}
              </div>
            </div>
            {expanded === a.id && <p className="text-sm text-gray-600 mt-2">{a.pitch}</p>}
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={`Edit proposal — ${editing.positionTitle || "Position"}`} onClose={() => setEditing(null)}>
          {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="label">Your quote (₹)</label>
              <input type="number" min="0" className="input" value={quote} onChange={(e) => setQuote(e.target.value)} />
            </div>
            <div>
              <label className="label">Your brief / ideas for the job</label>
              <textarea className="input" rows={4} value={pitch} onChange={(e) => setPitch(e.target.value)} />
            </div>
            <button className="btn-primary" disabled={busy} onClick={saveEdit}>{busy ? "Saving..." : "Save changes"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function QuoteBox({ job, team, onDone }: { job: Job; team: TeamMember[]; onDone: () => void }) {
  const openPositions = job.positions.filter(
    (p) => team.filter((t) => t.positionId === p.id).length < p.count
  );
  const [positionId, setPositionId] = useState(openPositions[0]?.id || "");
  const [pitch, setPitch] = useState("");
  const [quote, setQuote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (openPositions.length === 0) return null;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const amount = Number(quote);
      if (!positionId) throw new Error("Pick a position to apply for.");
      if (!pitch.trim() || pitch.trim().length < 10) throw new Error("Tell the owner your plan in at least 10 characters.");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter your quote amount in ₹.");
      await api.applyToJob(job.id, positionId, pitch.trim(), amount);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-lg mb-4">Submit your quote</h3>
      {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <div>
          <label className="label">Position you're applying for</label>
          <select className="input" value={positionId} onChange={(e) => setPositionId(e.target.value)}>
            {openPositions.map((p) => {
              const filled = team.filter((t) => t.positionId === p.id).length;
              return (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.count - filled} of {p.count} open)
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="label">Your quote (₹)</label>
          <input type="number" min="0" className="input" placeholder="e.g. 6500" value={quote} onChange={(e) => setQuote(e.target.value)} />
        </div>
        <div>
          <label className="label">Your brief / ideas for the job</label>
          <textarea className="input" rows={4} placeholder="How you'd approach the job, relevant experience, timeline..."
            value={pitch} onChange={(e) => setPitch(e.target.value)} />
        </div>
        <button onClick={submit} className="btn-primary" disabled={busy}>{busy ? "Submitting..." : "Submit quote"}</button>
      </div>
    </div>
  );
}

function QuotesSection({ job, team, onChanged, onError }: {
  job: Job;
  team: TeamMember[];
  onChanged: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const isOwner = user?.id === job.ownerId;

  async function accept(app: Application) {
    setBusy(true);
    try {
      const res = await api.acceptApplication(app.id);
      onError(res.teamComplete ? "Team complete! The job is awarded and chat is open." : "Hired! Continue filling the remaining positions.");
      await onChanged();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // group quotes by position
  const byPosition = new Map<string, Application[]>();
  for (const a of job.applications ?? []) {
    const list = byPosition.get(a.positionId) || [];
    list.push(a);
    byPosition.set(a.positionId, list);
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-lg mb-4">Quotes by position</h3>
      <div className="space-y-5">
        {job.positions.map((p) => {
          const apps = byPosition.get(p.id) ?? [];
          const filled = team.filter((t) => t.positionId === p.id).length;
          if (apps.length === 0) return null;
          return (
            <div key={p.id}>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                {p.title} <span className="font-normal text-gray-500">({filled}/{p.count} hired)</span>
              </p>
              <div className="space-y-3">
                {apps.map((a) => {
                  const applicant = a.applicant;
                  return (
                    <div key={a.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Link to={`/users/${a.applicantId}`} className="font-medium hover:underline">{applicant?.name}</Link>
                          <Stars value={applicant?.avgRating ?? null} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="badge bg-brand-50 text-brand-700 font-semibold">₹{a.quoteAmount?.toLocaleString("en-IN")}</span>
                          <span className={`badge ${a.status === "accepted" ? "badge-verified" : a.status === "rejected" ? "bg-gray-100 text-gray-500" : "badge-pending"}`}>{a.status}</span>
                        </div>
                      </div>
                      {applicant?.college && <p className="text-sm text-gray-500 mt-1">{applicant.college}{applicant.city ? ` · ${applicant.city}` : ""}</p>}
                      <p className="text-sm text-gray-600 mt-2">{a.pitch}</p>
                      {applicant && applicant.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {applicant.skills.slice(0, 6).map((s) => <span key={s} className="badge bg-gray-100 text-gray-700">{s}</span>)}
                        </div>
                      )}
                      {applicant && (
                        <div className="flex items-center gap-3 mt-2">
                          {applicant.linkedin && <a href={applicant.linkedin} target="_blank" rel="noreferrer" className="text-brand-600" title="LinkedIn"><Linkedin className="w-4 h-4" /></a>}
                          {applicant.github && <a href={applicant.github} target="_blank" rel="noreferrer" className="text-gray-700" title="GitHub"><Github className="w-4 h-4" /></a>}
                          {applicant.portfolio && <a href={applicant.portfolio} target="_blank" rel="noreferrer" className="text-gray-700" title="Portfolio"><Globe className="w-4 h-4" /></a>}
                          {applicant.resumeKey && (
                            <button onClick={() => api.downloadResume(applicant.id)} className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1">
                              <FileText className="w-4 h-4" /> Resume
                            </button>
                          )}
                          {isOwner && job.status === "open" && a.status === "pending" && filled < p.count && (
                            <button onClick={() => accept(a)} className="btn-primary ml-auto text-sm py-1.5" disabled={busy}>
                              Hire
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionsBar({ job, busy, onAct }: { job: Job; busy: boolean; onAct: (fn: () => Promise<unknown>, success?: string) => Promise<void> }) {
  const role = job.myRole;
  const [modal, setModal] = useState<"deliver" | "revision" | "dispute" | "milestones" | "edit" | null>(null);
  const [content, setContent] = useState("");
  const [milestoneTitles, setMilestoneTitles] = useState("");

  if (!role) return null;

  return (
    <div className="card">
      <div className="flex flex-wrap gap-2">
        {role === "owner" && job.status === "draft" && (
          <button className="btn-primary" disabled={busy} onClick={() => onAct(() => api.publishJob(job.id), "Job published — it's now open for quotes.")}>
            Publish job
          </button>
        )}
        {role === "owner" && ["draft", "open", "awarded"].includes(job.status) && (
          <button className="btn-ghost" disabled={busy} onClick={() => onAct(() => api.cancelJob(job.id), "Job cancelled.")}>
            Cancel job
          </button>
        )}
        {role === "owner" && ["draft", "open"].includes(job.status) && (
          <button className="btn-secondary" disabled={busy} onClick={() => setModal("edit")}>
            Edit details
          </button>
        )}
        {role === "team" && job.status === "in_progress" && (
          <button className="btn-primary" disabled={busy} onClick={() => setModal("deliver")}>
            Deliver final work
          </button>
        )}
        {role === "owner" && job.status === "delivered" && (
          <>
            <button className="btn-primary" disabled={busy} onClick={() => onAct(() => api.acceptJob(job.id), "Delivery accepted — job completed! Leave reviews.")}>
              Accept delivery
            </button>
            <button className="btn-secondary" disabled={busy} onClick={() => setModal("revision")}>
              Request revision
            </button>
          </>
        )}
        {["owner", "team"].includes(role) && job.status === "delivered" && (
          <button className="btn-ghost" disabled={busy} onClick={() => setModal("dispute")}>
            Raise dispute
          </button>
        )}
        {role === "owner" && ["draft", "open", "awarded"].includes(job.status) && (
          <button className="btn-secondary" disabled={busy} onClick={() => setModal("milestones")}>
            Add milestones
          </button>
        )}
      </div>

      {modal && modal !== "edit" && (
        <Modal title={modal === "deliver" ? "Deliver final work" : modal === "revision" ? "Request revision" : modal === "dispute" ? "Raise dispute" : "Add milestones"} onClose={() => setModal(null)}>
          {modal === "milestones" ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">One milestone per line, format: "Title (due YYYY-MM-DD)"</p>
              <textarea className="input" rows={4} placeholder={"Logo concept (due 2026-11-01)\nFinal design (due 2026-11-10)"}
                value={milestoneTitles} onChange={(e) => setMilestoneTitles(e.target.value)} />
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() => {
                  const milestones = milestoneTitles.split("\n").map((line) => {
                    const m = line.match(/^(.*?)\s*\(due\s*(.*?)\)\s*$/i);
                    return m ? { title: m[1].trim(), dueDate: m[2].trim() } : { title: line.trim() };
                  }).filter((m) => m.title);
                  if (!milestones.length) return;
                  onAct(() => api.addMilestones(job.id, milestones), "Milestones added.");
                  setModal(null);
                  setMilestoneTitles("");
                }}
              >
                Add milestones
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="label">{modal === "deliver" ? "Delivery notes" : "Describe the issue"}</label>
              <textarea className="input" rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
              <button
                className="btn-primary"
                disabled={busy || content.trim().length < 5}
                onClick={() => {
                  const fn = modal === "deliver"
                    ? () => api.deliverJob(job.id, content.trim())
                    : modal === "revision"
                      ? () => api.revisionJob(job.id, content.trim())
                      : () => api.disputeJob(job.id, content.trim());
                  onAct(fn, modal === "deliver" ? "Work delivered! Waiting for the owner to accept." : "Submitted.");
                  setModal(null);
                  setContent("");
                }}
              >
                Submit
              </button>
            </div>
          )}
        </Modal>
      )}

      {modal === "edit" && (
        <EditJobModal job={job} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await onAct(async () => {}, undefined); }} />
      )}
    </div>
  );
}

function EditJobModal({ job, onClose, onSaved }: { job: Job; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    title: job.title,
    description: job.description,
    category: job.category,
    requiredSkills: job.requiredSkills.join(", "),
    budgetMin: job.budgetMin != null ? String(job.budgetMin) : "",
    budgetMax: job.budgetMax != null ? String(job.budgetMax) : "",
    deadline: job.deadline || "",
    acceptanceCriteria: job.acceptanceCriteria || "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      await api.updateJob(job.id, {
        title: form.title,
        description: form.description,
        category: form.category,
        requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
        deadline: form.deadline || undefined,
        acceptanceCriteria: form.acceptanceCriteria || undefined,
      });
      await onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Edit job details" onClose={onClose} wide>
      {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="label">Required skills (comma-separated)</label>
          <input className="input" value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Budget min (₹)</label>
            <input type="number" min="0" className="input" value={form.budgetMin} onChange={(e) => setForm({ ...form, budgetMin: e.target.value })} />
          </div>
          <div>
            <label className="label">Budget max (₹)</label>
            <input type="number" min="0" className="input" value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} />
          </div>
          <div>
            <label className="label">Deadline</label>
            <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Acceptance criteria</label>
          <textarea className="input" rows={2} value={form.acceptanceCriteria} onChange={(e) => setForm({ ...form, acceptanceCriteria: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy || !form.title || !form.description || !form.category} onClick={save}>
            {busy ? "Saving..." : "Save changes"}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function MilestonesSection({ job, isOwner, isTeam, isMentor, onChanged, onError }: {
  job: Job;
  isOwner: boolean;
  isTeam: boolean;
  isMentor: boolean;
  onChanged: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const milestones = job.milestones ?? [];
  const [submitting, setSubmitting] = useState<Milestone | null>(null);
  const [revising, setRevising] = useState<Milestone | null>(null);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  if (milestones.length === 0 && !isOwner) return null;

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try {
      await fn();
      onError(msg);
      setSubmitting(null);
      setRevising(null);
      setContent("");
      await onChanged();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-lg mb-4">Milestones</h3>
      {milestones.length === 0 && <p className="text-sm text-gray-500">No milestones yet. The owner can add them.</p>}
      <div className="space-y-2">
        {milestones.map((m) => (
          <div key={m.id} className="flex items-center justify-between flex-wrap gap-2 rounded-lg bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${m.status === "approved" ? "bg-green-500" : m.status === "submitted" ? "bg-yellow-500" : "bg-gray-300"}`} />
              <span className="font-medium">{m.title}</span>
              {m.dueDate && <span className="text-gray-500">— due {m.dueDate}</span>}
              <span className="badge bg-gray-100 text-gray-600">{m.status}</span>
            </div>
            <div className="flex gap-2">
              {isTeam && m.status !== "approved" && (
                <button className="btn-secondary text-xs py-1.5" onClick={() => { setSubmitting(m); setContent(""); }}>
                  {m.status === "submitted" ? "Resubmit" : "Submit work"}
                </button>
              )}
              {isMentor && m.status === "submitted" && (
                <>
                  <button className="btn-primary text-xs py-1.5" disabled={busy} onClick={() => run(() => api.approveMilestone(m.id), "Milestone approved.")}>
                    Approve
                  </button>
                  <button className="btn-secondary text-xs py-1.5" onClick={() => { setRevising(m); setContent(""); }}>
                    Request revision
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {submitting && (
        <Modal title={`Submit work — ${submitting.title}`} onClose={() => setSubmitting(null)}>
          <label className="label">What did the team complete? Paste links if any.</label>
          <textarea className="input" rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
          <button className="btn-primary mt-4" disabled={busy || content.trim().length < 5}
            onClick={() => run(() => api.submitMilestone(submitting.id, content.trim()), "Submitted for mentor review.")}>
            {busy ? "Submitting..." : "Submit"}
          </button>
        </Modal>
      )}

      {revising && (
        <Modal title={`Request revision — ${revising.title}`} onClose={() => setRevising(null)}>
          <label className="label">What needs to change?</label>
          <textarea className="input" rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
          <button className="btn-primary mt-4" disabled={busy || content.trim().length < 5}
            onClick={() => run(() => api.revisionMilestone(revising.id, content.trim()), "Revision requested.")}>
            {busy ? "Sending..." : "Send"}
          </button>
        </Modal>
      )}
    </div>
  );
}

function UpdatesSection({ jobId, updates, onPosted, onError }: { jobId: string; updates: JobUpdate[]; onPosted: () => Promise<void>; onError: (m: string) => void }) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function post() {
    setBusy(true);
    try {
      await api.postJobUpdate(jobId, content.trim());
      setContent("");
      await onPosted();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-lg mb-4">Progress updates</h3>
      <p className="text-xs text-gray-400 -mt-2 mb-3">Visible only to the owner, the hired team and the assigned mentor.</p>
      <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
        {updates.length === 0 && <p className="text-sm text-gray-500">No updates yet.</p>}
        {updates.map((u) => (
          <div key={u.id} className="rounded-lg border border-gray-100 p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{u.authorName}</span>
              <span>{u.authorRole}</span>
              <span>·</span>
              <span>{new Date(u.createdAt + "Z").toLocaleString()}</span>
            </div>
            {u.milestoneTitle && <p className="text-xs text-brand-600 mt-1 font-medium">↳ {u.milestoneTitle}</p>}
            <p className="text-sm text-gray-700 mt-1">{u.content}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="input" placeholder="Post an update or comment..." value={content} onChange={(e) => setContent(e.target.value)} />
        <button className="btn-primary shrink-0" disabled={busy || content.trim().length < 1} onClick={post}>
          {busy ? "..." : "Post"}
        </button>
      </div>
    </div>
  );
}

function ReviewsSection({ job, team, me, onChanged, onError }: {
  job: Job;
  team: TeamMember[];
  me: { id: string } | null;
  onChanged: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const reviews = job.reviews ?? [];
  const [revieweeId, setRevieweeId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const isOwner = me && job.ownerId === me.id;
  const onTeam = me ? team.some((t) => t.userId === me.id) : false;

  // who I can still review
  const candidates = isOwner
    ? team.filter((t) => !reviews.some((r) => r.reviewerId === me?.id && r.revieweeId === t.userId))
    : onTeam
      ? [({ userId: job.ownerId, name: job.owner?.name || "Owner" } as TeamMember)].filter(
          (c) => !reviews.some((r) => r.reviewerId === me?.id && r.revieweeId === c.userId)
        )
      : [];

  useEffect(() => {
    if (!revieweeId && candidates.length) setRevieweeId(candidates[0].userId);
  }, [candidates.length, revieweeId]);

  async function submit() {
    setBusy(true);
    try {
      await api.submitReview(job.id, revieweeId, rating, comment.trim() || undefined);
      await onChanged();
      onError("Review submitted. Thanks!");
      setComment("");
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-lg mb-4">Reviews</h3>
      <div className="space-y-3 mb-4">
        {reviews.length === 0 && <p className="text-sm text-gray-500">No reviews yet.</p>}
        {reviews.map((r) => (
          <div key={r.id} className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{r.reviewerName}</span>
              <span className="text-xs text-gray-400">→</span>
              <span className="text-sm">{r.revieweeName}</span>
              <Stars value={r.rating} />
            </div>
            {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
          </div>
        ))}
      </div>
      {candidates.length > 0 ? (
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {isOwner ? "Rate a team member" : "Rate the owner"}
          </p>
          {isOwner && (
            <select className="input mb-3" value={revieweeId} onChange={(e) => setRevieweeId(e.target.value)}>
              {candidates.map((c) => (
                <option key={c.userId} value={c.userId}>{c.name} — {c.positionTitle || "Owner"}</option>
              ))}
            </select>
          )}
          <RatingInput value={rating} onChange={setRating} />
          <textarea className="input mt-3" rows={3} placeholder="How was working together?" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn-primary mt-3" disabled={busy || !revieweeId} onClick={submit}>{busy ? "Submitting..." : "Submit review"}</button>
        </div>
      ) : (
        (isOwner || onTeam) && <p className="text-sm text-gray-500">You've reviewed everyone on this job. 🎉</p>
      )}
    </div>
  );
}