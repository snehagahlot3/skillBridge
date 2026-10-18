import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type AdminBusinessRow, type AdminJobRow, type AdminMentorRow, type AdminStats, type AdminUserRow } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Modal, StatusBadge, VerifiedBadge } from "../components/ui";

type Tab = "overview" | "users" | "mentors" | "businesses" | "jobs";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [mentors, setMentors] = useState<AdminMentorRow[]>([]);
  const [businesses, setBusinesses] = useState<AdminBusinessRow[]>([]);
  const [jobs, setJobs] = useState<AdminJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    try {
      const [s, u, m, b, j] = await Promise.all([
        api.adminGetStats(),
        api.adminGetUsers(),
        api.adminGetMentors(),
        api.adminGetBusinesses(),
        api.adminGetJobs(),
      ]);
      setStats(s);
      setUsers(u);
      setMentors(m);
      setBusinesses(b);
      setJobs(j);
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

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try {
      await fn();
      setToast(msg);
      await loadAll();
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    logout();
    navigate("/");
  }

  if (loading) return <div className="p-8 text-center text-muted">Loading...</div>;

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: `Users (${users.length})` },
    { id: "mentors", label: `Mentors (${mentors.length})` },
    { id: "businesses", label: `Business owners (${businesses.length})` },
    { id: "jobs", label: `Jobs (${jobs.length})` },
  ];

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <header className="border-b border-line bg-surface sticky top-0 z-40">
        <div className="mx-auto max-w-[1120px] w-full px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-serif text-[22px] font-semibold text-ink tracking-tight hover:opacity-95">
            SkillBridge — Admin
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
        <nav className="flex items-center gap-6 overflow-x-auto border-b border-line mb-8 pb-0 scrollbar-none whitespace-nowrap" aria-label="Admin Navigation">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative pb-3 pt-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm ${
                tab === t.id
                  ? "text-ink font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-butter"
                  : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {toast && (
          <div className="mb-6 rounded-[8px] border border-line bg-surface p-4 text-sm text-ink border-l-4 border-l-accent">
            {toast}
          </div>
        )}

        {tab === "overview" && stats && <Overview stats={stats} />}

        {tab === "users" && (
          <div className="grid gap-4">
            {users.map((u) => (
              <div key={u.id} className="card p-6 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink">
                    {u.name} <span className="text-muted text-sm font-normal">({u.email})</span>
                  </p>
                  <p className="text-sm text-muted mt-0.5">
                    {u.college ? `${u.college} · ` : ""}{u.businessName ? `business: ${u.businessName} · ` : ""}{u.reviewCount} reviews
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={u.status === "active" ? "badge-verified" : "badge-draft"}>{u.status}</span>
                  {u.status === "active" ? (
                    <button className="btn-secondary text-xs py-1.5" disabled={busy} onClick={() => run(() => api.adminBlockUser(u.id), "User blocked.")}>
                      Block
                    </button>
                  ) : (
                    <button className="btn-primary text-xs py-1.5" disabled={busy} onClick={() => run(() => api.adminUnblockUser(u.id), "User unblocked.")}>
                      Unblock
                    </button>
                  )}
                  <button
                    className="btn-ghost text-xs py-1.5 text-accent hover:text-ink"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Remove ${u.name}? Their account, applications and team memberships will be deleted and their jobs cancelled.`)) {
                        run(() => api.adminDeleteUser(u.id), "User removed.");
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "mentors" && <MentorsTab mentors={mentors} busy={busy} run={run} />}

        {tab === "businesses" && (
          <BusinessesTab businesses={businesses} busy={busy} run={run} />
        )}

        {tab === "jobs" && (
          <JobsTab jobs={jobs} mentors={mentors} busy={busy} run={run} />
        )}
      </main>
    </div>
  );
}

function Overview({ stats }: { stats: AdminStats }) {
  const cards = [
    { label: "Users", value: stats.users },
    { label: "Mentors", value: stats.mentors },
    { label: "Blocked accounts", value: stats.blocked },
    { label: "Jobs", value: stats.jobs },
    { label: "Reviews", value: stats.reviews },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="stat-tile">
            <p className="stat-num">{c.value}</p>
            <p className="stat-label">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="card p-6">
        <h3 className="heading-card mb-4">Jobs by status</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(stats.jobsByStatus).map(([status, count]) => (
            <div key={status} className="stat-tile bg-bg/70 border border-line">
              <p className="font-serif text-[24px] font-semibold text-ink leading-tight">{count}</p>
              <p className="stat-label">{status.replace(/_/g, " ")}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MentorsTab({ mentors, busy, run }: { mentors: AdminMentorRow[]; busy: boolean; run: (fn: () => Promise<unknown>, msg: string) => Promise<void> }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", expertise: "", organization: "", bio: "" });
  const [formError, setFormError] = useState("");

  async function create() {
    setFormError("");
    try {
      await api.adminCreateMentor({
        name: form.name,
        email: form.email,
        password: form.password,
        expertise: form.expertise.split(",").map((s) => s.trim()).filter(Boolean),
        organization: form.organization || undefined,
        bio: form.bio || undefined,
      });
      setCreating(false);
      setForm({ name: "", email: "", password: "", expertise: "", organization: "", bio: "" });
      await run(async () => {}, "Mentor created. They can sign in now.");
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="heading-title text-xl">Mentors</h2>
        <button className="btn-primary" onClick={() => setCreating(true)}>Add mentor</button>
      </div>

      {creating && (
        <Modal title="Add mentor account" onClose={() => setCreating(false)}>
          <p className="text-sm text-muted mb-4 leading-relaxed">
            Mentors have no public signup — create their account here. Share the credentials with them.
          </p>
          {formError && <div className="mb-4 rounded-[8px] border border-line bg-surface p-3 text-sm text-ink border-l-4 border-l-accent">{formError}</div>}
          <div className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Password (min 8 chars)</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="label">Expertise (comma-separated)</label>
              <input className="input" placeholder="Data Analysis, Python, Marketing" value={form.expertise} onChange={(e) => setForm({ ...form, expertise: e.target.value })} />
            </div>
            <div>
              <label className="label">Organization</label>
              <input className="input" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
            </div>
            <div>
              <label className="label">Short bio</label>
              <textarea className="input" rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
            <button className="btn-primary w-full" disabled={busy || !form.name || !form.email || form.password.length < 8} onClick={create}>
              Add mentor
            </button>
          </div>
        </Modal>
      )}

      <div className="grid gap-3">
        {mentors.map((m) => (
          <div key={m.id} className="card p-6 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink">{m.name} <span className="text-muted text-sm font-normal">({m.email})</span></p>
              <p className="text-sm text-muted mt-0.5">
                {m.organization || "—"}{m.expertise.length > 0 && ` · ${m.expertise.join(", ")}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={m.status === "active" ? "badge-verified" : "badge-draft"}>{m.status}</span>
              {m.status === "active" ? (
                <button className="btn-secondary text-xs py-1.5" disabled={busy} onClick={() => run(() => api.adminBlockMentor(m.id), "Mentor blocked.")}>
                  Block
                </button>
              ) : (
                <button className="btn-primary text-xs py-1.5" disabled={busy} onClick={() => run(() => api.adminUnblockMentor(m.id), "Mentor unblocked.")}>
                  Unblock
                </button>
              )}
              <button
                className="btn-ghost text-xs py-1.5 text-accent hover:text-ink"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Remove mentor ${m.name}? Their account is deleted and their jobs are unassigned.`)) {
                    run(() => api.adminDeleteMentor(m.id), "Mentor removed.");
                  }
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BusinessesTab({ businesses, busy, run }: { businesses: AdminBusinessRow[]; busy: boolean; run: (fn: () => Promise<unknown>, msg: string) => Promise<void> }) {
  const [creating, setCreating] = useState(false);
  const [reviewing, setReviewing] = useState<AdminBusinessRow | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", businessName: "", sector: "", city: "" });
  const [formError, setFormError] = useState("");

  async function create() {
    setFormError("");
    try {
      await api.adminCreateBusinessOwner({
        name: form.name,
        email: form.email,
        password: form.password,
        businessName: form.businessName,
        sector: form.sector || undefined,
        city: form.city || undefined,
      });
      setCreating(false);
      setForm({ name: "", email: "", password: "", businessName: "", sector: "", city: "" });
      await run(async () => {}, "Business owner created.");
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="heading-title text-xl">Business owners</h2>
        <button className="btn-primary" onClick={() => setCreating(true)}>Add business owner</button>
      </div>

      {creating && (
        <Modal title="Add business owner" onClose={() => setCreating(false)}>
          {formError && <div className="mb-4 rounded-[8px] border border-line bg-surface p-3 text-sm text-ink border-l-4 border-l-accent">{formError}</div>}
          <div className="space-y-4">
            <div>
              <label className="label">Contact name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Password (min 8 chars)</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="label">Business name</label>
              <input className="input" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Sector</label>
                <input className="input" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
              </div>
              <div>
                <label className="label">City</label>
                <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <button className="btn-primary w-full" disabled={busy || !form.name || !form.email || form.password.length < 8 || !form.businessName} onClick={create}>
              Add business owner
            </button>
          </div>
        </Modal>
      )}

      <div className="grid gap-3">
        {businesses.map((b) => (
          <div key={b.userId} className="card p-6 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink">{b.businessName} <span className="text-muted text-sm font-normal">({b.name} · {b.email})</span></p>
              <p className="text-sm text-muted mt-0.5">{b.city} · {b.sector}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {b.verificationStatus === "verified" ? (
                <VerifiedBadge label={b.verificationStatus} />
              ) : (
                <span className="badge-draft">{b.verificationStatus}</span>
              )}
              <button className="btn-secondary text-xs py-1.5" onClick={() => setReviewing(b)}>
                Review
              </button>
              <button
                className="btn-ghost text-xs py-1.5 text-accent hover:text-ink"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Remove business owner ${b.name}? Their account is deleted and their jobs cancelled.`)) {
                    run(() => api.adminDeleteUser(b.userId), "Business owner removed.");
                  }
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {reviewing && (
        <Modal title="Business verification" onClose={() => setReviewing(null)} wide>
          <div className="space-y-4">
            <div className="rounded-[8px] border border-line bg-bg/50 p-4 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <InfoRow label="Contact name" value={reviewing.name} />
              <InfoRow label="Email" value={reviewing.email} />
              <InfoRow label="Business name" value={reviewing.businessName} />
              <InfoRow label="Sector" value={reviewing.sector} />
              <InfoRow label="City" value={reviewing.city} />
              <InfoRow label="Udyam number" value={reviewing.udyamNumber} />
              <InfoRow label="Verification status" value={reviewing.verificationStatus} />
              <InfoRow label="Account status" value={reviewing.status} />
            </div>
            <div className="flex gap-2">
              <button
                className="btn-primary flex-1"
                disabled={busy}
                onClick={() => {
                  run(() => api.adminVerifyBusiness(reviewing.userId), "Business approved.");
                  setReviewing(null);
                }}
              >
                ✓ Approve
              </button>
              <button
                className="btn-ghost flex-1 border border-line text-red-600 hover:bg-red-50"
                disabled={busy}
                onClick={() => {
                  run(() => api.adminRejectBusiness(reviewing.userId), "Business rejected.");
                  setReviewing(null);
                }}
              >
                ✕ Reject
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">{label}</p>
      <p className="text-ink mt-0.5">{value || "—"}</p>
    </div>
  );
}

function JobsTab({ jobs, mentors, busy, run }: {
  jobs: AdminJobRow[];
  mentors: AdminMentorRow[];
  busy: boolean;
  run: (fn: () => Promise<unknown>, msg: string) => Promise<void>;
}) {
  const activeMentors = mentors.filter((m) => m.status === "active");

  return (
    <div className="grid gap-4">
      {jobs.map((j) => (
        <div key={j.id} className="card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div>
              <p className="font-semibold text-ink text-base">{j.title}</p>
              <div className="text-sm text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Owner: {j.owner?.name || "—"}</span>
                <span>·</span>
                <span>status:</span>
                <StatusBadge status={j.status} />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {j.status === "delisted" ? (
                <button className="btn-primary text-xs py-1.5" disabled={busy} onClick={() => run(() => api.adminRelistJob(j.id), "Job relisted.")}>
                  Relist
                </button>
              ) : (
                <button className="btn-secondary text-xs py-1.5" disabled={busy} onClick={() => run(() => api.adminDelistJob(j.id), "Job delisted.")}>
                  Delist
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-line grid md:grid-cols-2 gap-4">
            <div className="rounded-[8px] border border-line bg-bg/50 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-2">Mentor</p>
              <div className="flex items-center gap-2">
                <select
                  className="input text-xs"
                  value={j.mentor?.id || ""}
                  onChange={(e) =>
                    run(
                      () => api.adminAssignMentor(j.id, e.target.value || null),
                      e.target.value ? "Mentor reassigned." : "Mentor removed from job."
                    )
                  }
                >
                  <option value="">None</option>
                  {activeMentors.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-[8px] border border-line bg-bg/50 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-2">Team ({j.teamSize})</p>
              {j.team.length === 0 && <p className="text-xs text-muted">No one hired yet.</p>}
              <div className="space-y-1.5">
                {j.team.map((t) => (
                  <div key={t.userId} className="flex items-center justify-between text-xs">
                    <span className="text-ink font-medium">{t.name} <span className="text-muted font-normal">— {t.positionTitle}</span></span>
                    {!["completed", "cancelled", "delisted"].includes(j.status) && (
                      <button
                        className="text-accent hover:text-ink hover:underline text-xs"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Free ${t.name} from this job? The job goes back to public listings if the team is no longer complete.`)) {
                            run(() => api.adminRemoveMember(j.id, t.userId), `${t.name} removed from the job.`);
                          }
                        }}
                      >
                        Free from job
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {j.status === "completed" && (
                <button
                  className="btn-primary text-xs py-1.5 mt-2"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Restart this job? Work resumes and it leaves the completed state.")) {
                      run(() => api.restartJob(j.id), "Job restarted — work has resumed.");
                    }
                  }}
                >
                  Restart job
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}