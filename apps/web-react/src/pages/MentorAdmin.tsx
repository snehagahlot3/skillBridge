import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type BusinessRow, type Project, type UserRow, type VerificationProject } from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface SubmissionRow {
  id: string;
  milestoneId: string;
  applicantId: string;
  notes?: string;
  submittedAt: string;
  milestone?: { title: string; status: string } | null;
  applicant?: { id: string; name: string } | null;
}

export default function MentorAdmin() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [queue, setQueue] = useState<Project[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [projects, setProjects] = useState<VerificationProject[]>([]);
  const [mentors, setMentors] = useState<{ userId: string; name: string }[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [reviewing, setReviewing] = useState<{ project: Project; submissions: SubmissionRow[] } | null>(null);

  async function loadAll() {
    try {
      const [submitted, underReview, biz, proj, men, us] = await Promise.all([
        api.getProjects({ status: "submitted" }),
        api.getProjects({ status: "under_review" }),
        api.adminGetBusinesses(),
        api.adminGetProjects(),
        api.adminGetMentors(),
        api.adminGetUsers(),
      ]);
      setQueue([...submitted, ...underReview]);
      setBusinesses(biz);
      setProjects(proj);
      setMentors(men);
      setUsers(us);
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

  async function openReview(project: Project) {
    try {
      const submissions = (await api.getProjectSubmissions(project.id)) as SubmissionRow[];
      setReviewing({ project, submissions });
    } catch (err) {
      setToast((err as Error).message);
    }
  }

  async function verify(userId: string) {
    try {
      await api.adminVerifyBusiness(userId);
      loadAll();
    } catch (err) {
      setToast((err as Error).message);
    }
  }

  async function assign(projectId: string, mentorId: string) {
    try {
      await api.adminAssignMentor(projectId, mentorId);
      loadAll();
    } catch (err) {
      setToast((err as Error).message);
    }
  }

  function signOut() {
    logout();
    navigate("/");
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">SkillBridge — Mentor Panel</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button onClick={signOut} className="btn-ghost">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-10">
        {toast && <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">{toast}</div>}

        <section>
          <h2 className="text-2xl font-bold mb-4">Review Queue</h2>
          <div className="grid gap-3">
            {queue.map((project) => (
              <div key={project.id} className="card flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{project.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                  <span className={`badge mt-2 ${project.status === "submitted" ? "badge-pending" : "badge-paid"}`}>{project.status}</span>
                </div>
                <button onClick={() => openReview(project)} className="btn-primary shrink-0">Review</button>
              </div>
            ))}
            {queue.length === 0 && <div className="card text-center text-gray-500">No submissions pending review.</div>}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Business Verification</h2>
          <div className="grid gap-3">
            {businesses.map((b) => (
              <div key={b.userId} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium">{b.businessName} <span className="text-gray-500 text-sm">({b.name})</span></p>
                  <p className="text-sm text-gray-500">{b.city} · {b.sector}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={b.verificationStatus === "verified" ? "badge-verified" : "badge-pending"}>{b.verificationStatus}</span>
                  {b.verificationStatus !== "verified" && (
                    <button onClick={() => verify(b.userId)} className="btn-primary">Verify</button>
                  )}
                </div>
              </div>
            ))}
            {businesses.length === 0 && <div className="card text-center text-gray-500">No business profiles yet.</div>}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Projects &amp; Mentor Assignment</h2>
          <div className="grid gap-3">
            {projects.map((p) => (
              <div key={p.id} className="card flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-sm text-gray-500">Owner: {p.owner?.name} · status: {p.status}</p>
                </div>
                <select className="input max-w-xs" value={p.mentor?.id || ""} onChange={(e) => assign(p.id, e.target.value)}>
                  <option value="">Assign mentor...</option>
                  {mentors.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Users</h2>
          <div className="grid gap-3">
            {users.map((u) => (
              <div key={u.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium">{u.name} <span className="text-gray-500 text-sm">({u.email})</span></p>
                  <p className="text-sm text-gray-500">{u.role}{u.college ? ` · ${u.college}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  {u.skills?.length > 0 && (
                    <div className="hidden md:flex flex-wrap gap-1">
                      {u.skills.slice(0, 4).map((s) => <span key={s} className="badge bg-gray-100 text-gray-700">{s}</span>)}
                    </div>
                  )}
                  {u.resumeKey && (
                    <button onClick={() => api.downloadResume(u.id)} className="text-sm text-brand-600 hover:underline">Resume</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {reviewing && (
        <ReviewModal project={reviewing.project} submissions={reviewing.submissions} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); loadAll(); }} />
      )}
    </div>
  );
}

function ReviewModal({ project, submissions, onClose, onDone }: { project: Project; submissions: SubmissionRow[]; onClose: () => void; onDone: () => void }) {
  const [selected, setSelected] = useState<string>(submissions[0]?.id || "");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");
  const [decision, setDecision] = useState<"approved" | "revision" | "rejected">("approved");
  const [busy, setBusy] = useState(false);

  const current = submissions.find((s) => s.id === selected);

  async function submitReview() {
    if (!selected) return;
    setBusy(true);
    try {
      const rubricScores = project.rubric?.map((r) => ({ criterion: r.criterion, score: scores[r.criterion] || 3 })) || [];
      await api.reviewSubmission({ submissionId: selected, rubricScores, comments, decision });
      onDone();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <h3 className="font-semibold text-lg mb-4">Review: {project.title}</h3>

        {submissions.length === 0 && <p className="text-gray-500">No submissions found for this project.</p>}

        {submissions.length > 0 && (
          <div className="space-y-4">
            <div>
              <label className="label">Submission</label>
              <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
                {submissions.map((s) => (
                  <option key={s.id} value={s.id}>{s.milestone?.title || "Milestone"} — {s.applicant?.name || "User"}</option>
                ))}
              </select>
            </div>

            {current && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="font-medium mb-1">Notes</p>
                <p className="text-gray-600">{current.notes || "—"}</p>
              </div>
            )}

            {project.rubric?.map((r) => (
              <div key={r.criterion}>
                <label className="label">{r.criterion}</label>
                <p className="text-sm text-gray-600 mb-1">{r.description}</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button key={n} onClick={() => setScores({ ...scores, [r.criterion]: n })}
                      className={`w-8 h-8 rounded border text-sm ${(scores[r.criterion] || 3) === n ? "bg-brand-600 text-white" : "border-gray-300"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <label className="label">Comments</label>
              <textarea className="input" rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
            </div>
            <div>
              <label className="label">Decision</label>
              <select className="input" value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)}>
                <option value="approved">Approve — verify skills</option>
                <option value="revision">Request revision</option>
                <option value="rejected">Reject</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={submitReview} className="btn-primary" disabled={busy}>{busy ? "Submitting..." : "Submit review"}</button>
              <button onClick={onClose} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
