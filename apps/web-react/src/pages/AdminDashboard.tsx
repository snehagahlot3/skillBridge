import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AdminBusinessRow, type AdminJobRow, type AdminMentorRow, type AdminStats, type AdminUserRow } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Modal, StatusBadge } from "../components/ui";

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

  if (loading) return <div className="p-8">Loading...</div>;

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: `Users (${users.length})` },
    { id: "mentors", label: `Mentors (${mentors.length})` },
    { id: "businesses", label: `Businesses (${businesses.length})` },
    { id: "jobs", label: `Jobs (${jobs.length})` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">SkillBridge — Admin</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button onClick={signOut} className="btn-ghost">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? "btn-primary" : "btn-secondary"}>
              {t.label}
            </button>
          ))}
        </div>

        {toast && <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">{toast}</div>}

        {tab === "overview" && stats && <Overview stats={stats} />}

        {tab === "users" && (
          <div className="grid gap-3">
            {users.map((u) => (
              <div key={u.id} className="card flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium">
                    {u.name} <span className="text-gray-500 text-sm">({u.email})</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {u.college ? `${u.college} · ` : ""}{u.businessName ? `business: ${u.businessName} · ` : ""}{u.reviewCount} reviews
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={u.status === "active" ? "badge-verified" : "badge bg-red-100 text-red-800"}>{u.status}</span>
                  {u.status === "active" ? (
                    <button className="btn-secondary text-xs py-1.5" disabled={busy} onClick={() => run(() => api.adminBlockUser(u.id), "User blocked.")}>
                      Block
                    </button>
                  ) : (
                    <button className="btn-primary text-xs py-1.5" disabled={busy} onClick={() => run(() => api.adminUnblockUser(u.id), "User unblocked.")}>
                      Unblock
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "mentors" && <MentorsTab mentors={mentors} busy={busy} run={run} />}

        {tab === "businesses" && (
          <div className="grid gap-3">
            {businesses.map((b) => (
              <div key={b.userId} className="card flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium">{b.businessName} <span className="text-gray-500 text-sm">({b.name})</span></p>
                  <p className="text-sm text-gray-500">{b.city} · {b.sector}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={b.verificationStatus === "verified" ? "badge-verified" : "badge-pending"}>{b.verificationStatus}</span>
                  {b.verificationStatus !== "verified" && (
                    <button className="btn-primary" disabled={busy} onClick={() => run(() => api.adminVerifyBusiness(b.userId), "Business verified.")}>
                      Verify
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "jobs" && (
          <div className="grid gap-3">
            {jobs.map((j) => (
              <div key={j.id} className="card flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium">{j.title}</p>
                  <p className="text-sm text-gray-500">
                    Owner: {j.owner?.name} · mentor: {j.mentor?.name || "—"} · team: {j.teamSize}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={j.status} />
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
            ))}
          </div>
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
          <div key={c.label} className="card text-center">
            <p className="text-2xl font-bold text-brand-600">{c.value}</p>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Jobs by status</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(stats.jobsByStatus).map(([status, count]) => (
            <div key={status} className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-lg font-bold">{count}</p>
              <p className="text-xs text-gray-500">{status.replace(/_/g, " ")}</p>
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
        <h2 className="text-xl font-bold">Mentors</h2>
        <button className="btn-primary" onClick={() => setCreating(true)}>Create mentor</button>
      </div>

      {creating && (
        <Modal title="Create mentor account" onClose={() => setCreating(false)}>
          <p className="text-sm text-gray-500 mb-4">Mentors have no public signup — create their account here. Share the credentials with them.</p>
          {formError && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
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
            <button className="btn-primary" disabled={busy || !form.name || !form.email || form.password.length < 8} onClick={create}>
              Create mentor
            </button>
          </div>
        </Modal>
      )}

      <div className="grid gap-3">
        {mentors.map((m) => (
          <div key={m.id} className="card flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium">{m.name} <span className="text-gray-500 text-sm">({m.email})</span></p>
              <p className="text-sm text-gray-500">
                {m.organization || "—"}{m.expertise.length > 0 && ` · ${m.expertise.join(", ")}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={m.status === "active" ? "badge-verified" : "badge bg-red-100 text-red-800"}>{m.status}</span>
              {m.status === "active" ? (
                <button className="btn-secondary text-xs py-1.5" disabled={busy} onClick={() => run(() => api.adminBlockMentor(m.id), "Mentor blocked.")}>
                  Block
                </button>
              ) : (
                <button className="btn-primary text-xs py-1.5" disabled={busy} onClick={() => run(() => api.adminUnblockMentor(m.id), "Mentor unblocked.")}>
                  Unblock
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}