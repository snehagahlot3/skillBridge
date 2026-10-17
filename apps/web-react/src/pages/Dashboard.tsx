import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Upload } from "lucide-react";
import { api, budgetLabel, type Job, type MyApplication, type ChatRoomSummary, type JobReview, type PublicUser } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Stars, StatusBadge } from "../components/ui";
import Assistant from "../components/Assistant";

type Tab = "find" | "myjobs" | "mywork" | "messages" | "profile" | "ai";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, me, refresh, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("find");
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myWork, setMyWork] = useState<MyApplication[]>([]);
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  async function loadAll() {
    try {
      const [open, posted, mine, chatRooms] = await Promise.all([
        api.getJobs({ status: "open" }),
        api.getJobs({ mine: true }),
        api.getMyApplications(),
        api.getChatRooms().catch(() => [] as ChatRoomSummary[]),
      ]);
      setOpenJobs(open);
      setMyJobs(posted);
      setMyWork(mine);
      setRooms(chatRooms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function signOut() {
    logout();
    navigate("/");
  }

  if (loading) return <div className="p-8">Loading...</div>;

  const tabs: { id: Tab; label: string }[] = [
    { id: "find", label: "Find Jobs" },
    { id: "myjobs", label: "My Jobs" },
    { id: "mywork", label: "My Work" },
    { id: "messages", label: `Messages${rooms.some((r) => r.unread > 0) ? ` (${rooms.reduce((s, r) => s + r.unread, 0)})` : ""}` },
    { id: "ai", label: "AI Help" },
    { id: "profile", label: "Profile" },
  ];

  const totalUnread = rooms.reduce((s, r) => s + r.unread, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-brand-600">SkillBridge</h1>
            {me?.business?.verificationStatus === "verified" && <span className="badge-verified">Verified business</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.name}</span>
            {me?.profile?.publicSlug && (
              <Link to={`/users/${user?.id}`} className="btn-ghost text-sm">Public profile</Link>
            )}
            <button onClick={signOut} className="btn-ghost">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? "btn-primary" : "btn-secondary"}>
              {t.label}
              {t.id === "messages" && totalUnread > 0 && (
                <span className="ml-1 rounded-full bg-brand-600 text-white text-xs px-1.5">{totalUnread}</span>
              )}
            </button>
          ))}
        </div>

        {toast && <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">{toast}</div>}

        {tab === "find" && <FindJobs jobs={openJobs} />}
        {tab === "myjobs" && <MyJobs jobs={myJobs} onChanged={loadAll} onError={setToast} />}
        {tab === "mywork" && <MyWork items={myWork} />}
        {tab === "messages" && <Messages rooms={rooms} onOpened={() => setTimeout(loadAll, 500)} />}
        {tab === "ai" && <Assistant />}
        {tab === "profile" && <ProfileTab onChanged={refresh} onError={setToast} />}
      </main>
    </div>
  );
}

function FindJobs({ jobs }: { jobs: Job[] }) {
  const [skillFilter, setSkillFilter] = useState("");
  const filtered = skillFilter
    ? jobs.filter((j) => j.requiredSkills?.some((s) => s.toLowerCase().includes(skillFilter.toLowerCase())))
    : jobs;

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Open jobs</h2>
        <input className="input max-w-xs" placeholder="Filter by skill..." value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} />
      </div>
      <div className="grid gap-4">
        {filtered.map((job) => {
          const applied = job.myApplication != null;
          const hiredCount = (job.positionFill ?? []).reduce((s, p) => s + (p.filled ?? 0), 0);
          const totalPositions = (job.positionFill ?? []).reduce((s, p) => s + p.count, 0);
          return (
            <div key={job.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link to={`/jobs/${job.id}`} className="font-semibold text-lg hover:underline">{job.title}</Link>
                  <p className="text-sm text-gray-600 mt-1">{job.description.slice(0, 160)}{job.description.length > 160 ? "…" : ""}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="badge bg-brand-50 text-brand-700">{budgetLabel(job)}</span>
                    <span className="badge bg-gray-100 text-gray-700">{job.category}</span>
                    {job.owner?.businessName && <span className="badge bg-gray-100 text-gray-700">{job.owner.businessName}</span>}
                    {job.owner?.verificationStatus === "verified" && <span className="badge-verified">Verified</span>}
                    {totalPositions > 1 && (
                      <span className="badge bg-blue-50 text-blue-700">
                        {hiredCount > 0 ? `Team hiring: ${hiredCount}/${totalPositions} filled` : `Team of ${totalPositions} needed`}
                      </span>
                    )}
                    {applied && (
                      <span className={`badge ${job.myApplication!.status === "accepted" ? "badge-verified" : job.myApplication!.status === "rejected" ? "bg-gray-100 text-gray-500" : "badge-pending"}`}>
                        {job.myApplication!.status === "pending" ? "Applied — awaiting decision" : job.myApplication!.status}
                      </span>
                    )}
                  </div>
                </div>
                {!applied ? (
                  <Link to={`/jobs/${job.id}`} className="btn-primary shrink-0">View &amp; quote</Link>
                ) : (
                  <Link to={`/jobs/${job.id}`} className="btn-secondary shrink-0">View application</Link>
                )}
              </div>
              {job.requiredSkills?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {job.requiredSkills.map((skill) => (
                    <span key={skill} className="badge bg-gray-100 text-gray-700">{skill}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="card text-center text-gray-500">No open jobs found.</div>}
      </div>
    </>
  );
}

function MyJobs({ jobs, onChanged, onError }: { jobs: Job[]; onChanged: () => Promise<void>; onError: (m: string) => void }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Jobs I posted</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">Post a job</button>
      </div>

      {showForm && <PostJobForm onDone={() => { setShowForm(false); onChanged(); }} onError={onError} />}

      <div className="grid gap-4">
        {jobs.map((job) => (
          <div key={job.id} className="card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <Link to={`/jobs/${job.id}`} className="font-semibold text-lg hover:underline">{job.title}</Link>
                <p className="text-sm text-gray-600 mt-1">{job.description.slice(0, 140)}{job.description.length > 140 ? "…" : ""}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="badge bg-brand-50 text-brand-700">{budgetLabel(job)}</span>
                  <StatusBadge status={job.status} />
                  {job.applicationCount != null && job.applicationCount > 0 && (
                    <span className="badge bg-blue-50 text-blue-700">{job.applicationCount} quote{job.applicationCount === 1 ? "" : "s"}</span>
                  )}
                </div>
              </div>
              <Link to={`/jobs/${job.id}`} className="btn-secondary shrink-0">Manage</Link>
            </div>
          </div>
        ))}
        {jobs.length === 0 && <div className="card text-center text-gray-500">No jobs posted yet. Post your first job!</div>}
      </div>
    </>
  );
}

function PostJobForm({ onDone, onError }: { onDone: () => void; onError: (m: string) => void }) {
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    requiredSkills: "",
    positions: "",
    budgetMin: "",
    budgetMax: "",
    deadline: "",
    acceptanceCriteria: "",
    milestones: "",
  });

  async function generateBrief() {
    setAiLoading(true);
    try {
      const brief = await api.generateBrief(aiDescription);
      setAiBrief(brief.title);
      setForm((f) => ({
        ...f,
        title: brief.title,
        description: brief.summary,
        requiredSkills: brief.requiredSkills.join(", "),
        acceptanceCriteria: brief.acceptanceCriteria,
        milestones: brief.milestones.map((m) => `${m.title} (due ${m.dueDate})`).join("\n"),
      }));
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  async function create() {
    setBusy(true);
    try {
      const positions = form.positions
        .split("\n")
        .map((line) => {
          const m = line.match(/^(.*?)\s*[x×*]\s*(\d+)\s*$/i);
          return m ? { title: m[1].trim(), count: Number(m[2]) } : { title: line.trim(), count: 1 };
        })
        .filter((p) => p.title);
      await api.createJob({
        title: form.title,
        description: form.description,
        category: form.category,
        requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        positions: positions.length ? positions : undefined,
        budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
        deadline: form.deadline || undefined,
        acceptanceCriteria: form.acceptanceCriteria || undefined,
        milestones: form.milestones
          .split("\n")
          .map((line) => {
            const m = line.match(/^(.*?)\s*\(due\s*(.*?)\)\s*$/i);
            return m ? { title: m[1].trim(), dueDate: m[2].trim() } : { title: line.trim() };
          })
          .filter((m) => m.title),
      });
      onDone();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mb-6">
      <h3 className="font-semibold text-lg mb-4">Post a new job</h3>
      <div className="space-y-5">
        <section>
          <label className="label">Describe the job in plain language (AI will structure it)</label>
          <textarea className="input" rows={3} placeholder="e.g. We need a Diwali sale campaign for our store: Instagram posts, reel scripts and a caption calendar..."
            value={aiDescription} onChange={(e) => setAiDescription(e.target.value)} />
          <button onClick={generateBrief} className="btn-secondary mt-2" disabled={aiLoading || aiDescription.trim().length < 20}>
            {aiLoading ? "Generating..." : "Generate AI brief"}
          </button>
          {aiBrief && <p className="mt-2 text-sm text-brand-700">AI brief generated — edit the fields below before publishing.</p>}
        </section>

        <section className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" placeholder="Marketing, Video Editing, Web Design, Software..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="label">Budget min (₹)</label>
              <input type="number" min="0" className="input" placeholder="5000" value={form.budgetMin} onChange={(e) => setForm({ ...form, budgetMin: e.target.value })} />
            </div>
            <div>
              <label className="label">Budget max (₹)</label>
              <input type="number" min="0" className="input" placeholder="8000" value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} />
            </div>
            <div>
              <label className="label">Deadline</label>
              <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Required skills (comma-separated)</label>
            <input className="input" value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
          </div>
          <div className="mt-4">
            <label className="label">Team positions (optional — leave empty to hire a single freelancer)</label>
            <textarea className="input" rows={3} placeholder={"Marketing x3\nGraphic Designer x1\nContent Creator x1"}
              value={form.positions} onChange={(e) => setForm({ ...form, positions: e.target.value })} />
          </div>
          <div className="mt-4">
            <label className="label">Acceptance criteria</label>
            <textarea className="input" rows={2} value={form.acceptanceCriteria} onChange={(e) => setForm({ ...form, acceptanceCriteria: e.target.value })} />
          </div>
          <div className="mt-4">
            <label className="label">Milestones (one per line, optional: "Title (due YYYY-MM-DD)")</label>
            <textarea className="input" rows={3} placeholder={"Concept (due 2026-11-01)\nFinal delivery (due 2026-11-10)"}
              value={form.milestones} onChange={(e) => setForm({ ...form, milestones: e.target.value })} />
          </div>
        </section>

        <div className="flex gap-2">
          <button onClick={create} className="btn-primary" disabled={busy || !form.title || !form.description || !form.category}>
            {busy ? "Saving..." : "Save as draft"}
          </button>
          <button onClick={onDone} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function MyWork({ items }: { items: MyApplication[] }) {
  return (
    <>
      <h2 className="text-2xl font-bold mb-4">My applications &amp; work</h2>
      <div className="grid gap-4">
        {items.map((app) => {
          const hired = app.status === "accepted" && app.onTeam;
          return (
            <div key={app.id} className="card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <Link to={`/jobs/${app.jobId}`} className="font-semibold text-lg hover:underline">
                    {app.job?.title || "Job"}
                  </Link>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className={`badge ${hired ? "badge-verified" : app.status === "rejected" ? "bg-gray-100 text-gray-500" : "badge-pending"}`}>
                      {hired ? "hired" : app.status}
                    </span>
                    {app.positionTitle && <span className="badge bg-brand-50 text-brand-700">{app.positionTitle}</span>}
                    {app.job && <StatusBadge status={app.job.status} />}
                    {app.job && <span className="badge bg-gray-100 text-gray-700">{budgetLabel(app.job)}</span>}
                    {app.quoteAmount != null && <span className="badge bg-gray-100 text-gray-700">Your quote: ₹{app.quoteAmount.toLocaleString("en-IN")}</span>}
                  </div>
                  {hired && app.milestones.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {app.milestones.map((m) => (
                        <span key={m.id} className="badge bg-gray-100 text-gray-600">
                          {m.status === "approved" ? "✓" : m.status === "submitted" ? "•" : "○"} {m.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {hired && <Link to={`/chat/${app.jobId}`} className="btn-secondary">Chat</Link>}
                  <Link to={`/jobs/${app.jobId}`} className="btn-primary">Open</Link>
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div className="card text-center text-gray-500">You haven't applied to any jobs yet.</div>}
      </div>
    </>
  );
}

function Messages({ rooms, onOpened }: { rooms: ChatRoomSummary[]; onOpened: () => void }) {
  // merge group + mentor rooms into one entry per job; toggle switches inside the chat page
  const byJob = new Map<string, { room: ChatRoomSummary; unread: number; hasMentor: boolean }>();
  for (const room of rooms) {
    const existing = byJob.get(room.jobId);
    if (existing) {
      existing.unread += room.unread;
      existing.hasMentor = existing.hasMentor || room.scope === "mentor";
    } else {
      byJob.set(room.jobId, { room, unread: room.unread, hasMentor: room.scope === "mentor" });
    }
  }
  const merged = [...byJob.values()];

  return (
    <>
      <h2 className="text-2xl font-bold mb-4">Messages</h2>
      <div className="grid gap-3">
        {merged.map(({ room, unread, hasMentor }) => (
          <Link key={room.jobId} to={`/chat/${room.jobId}`} onClick={onOpened} className="card flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="font-semibold">{room.title}</p>
              <p className="text-sm text-gray-500">
                {hasMentor && <span className="badge bg-brand-50 text-brand-700 mr-1">mentor room</span>}
                team: {room.teamNames.join(", ") || "—"}{room.mentorName ? ` · mentor: ${room.mentorName}` : ""}
                {" "}· <StatusBadge status={room.status} />
              </p>
            </div>
            {unread > 0 && <span className="rounded-full bg-brand-600 text-white text-xs font-semibold px-2 py-1">{unread} new</span>}
          </Link>
        ))}
        {merged.length === 0 && <div className="card text-center text-gray-500">No conversations yet. Chat opens once a job is awarded.</div>}
      </div>
    </>
  );
}

function ProfileTab({ onChanged, onError }: { onChanged: () => Promise<void> | void; onError: (m: string) => void }) {
  const { me, user } = useAuth();
  const [form, setForm] = useState({
    phone: "",
    city: "",
    college: "",
    bio: "",
    skills: "",
    linkedin: "",
    github: "",
    portfolio: "",
  });
  const [business, setBusiness] = useState({ businessName: "", sector: "", city: "", udyamNumber: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publicData, setPublicData] = useState<PublicUser | null>(null);

  useEffect(() => {
    if (me?.profile) {
      setForm({
        phone: me.profile.phone || "",
        city: me.profile.city || "",
        college: me.profile.college || "",
        bio: me.profile.bio || "",
        skills: (me.profile.skills || []).join(", "),
        linkedin: me.profile.linkedin || "",
        github: me.profile.github || "",
        portfolio: me.profile.portfolio || "",
      });
    }
    if (me?.business) {
      setBusiness({
        businessName: me.business.businessName || "",
        sector: me.business.sector || "",
        city: me.business.city || "",
        udyamNumber: me.business.udyamNumber || "",
      });
    }
    if (user) {
      api.getUser(user.id).then(setPublicData).catch(() => setPublicData(null));
    }
  }, [me, user]);

  async function saveProfile() {
    setSaving(true);
    try {
      await api.updateProfile({
        phone: form.phone,
        city: form.city,
        college: form.college,
        bio: form.bio,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        linkedin: form.linkedin,
        github: form.github,
        portfolio: form.portfolio,
      });
      await onChanged();
      onError("Profile saved.");
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function saveBusiness() {
    setSaving(true);
    try {
      await api.updateBusiness(business);
      await onChanged();
      onError("Business details saved.");
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadResume(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadResume(file);
      await onChanged();
      onError("Resume uploaded.");
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Talent profile</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">College / university</label>
            <input className="input" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
          </div>
          <div>
            <label className="label">Skills (comma-separated)</label>
            <input className="input" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea className="input" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">LinkedIn</label>
              <input className="input" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
            </div>
            <div>
              <label className="label">GitHub</label>
              <input className="input" value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} />
            </div>
            <div>
              <label className="label">Portfolio / website</label>
              <input className="input" value={form.portfolio} onChange={(e) => setForm({ ...form, portfolio: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label">Resume</label>
            <div className="flex items-center gap-3">
              <label className="btn-secondary cursor-pointer">
                <Upload className="w-4 h-4 mr-1" />
                {uploading ? "Uploading..." : "Upload resume"}
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={uploadResume} />
              </label>
              {me?.profile?.resumeKey && <span className="text-sm text-gray-600">{me.profile.resumeName}</span>}
            </div>
          </div>

          <button onClick={saveProfile} className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Business details</h3>
        <p className="text-sm text-gray-500 mb-4">Add these when you want to post jobs as a business.</p>
        <div className="space-y-4">
          <div>
            <label className="label">Business name</label>
            <input className="input" value={business.businessName} onChange={(e) => setBusiness({ ...business, businessName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Sector</label>
              <input className="input" value={business.sector} onChange={(e) => setBusiness({ ...business, sector: e.target.value })} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={business.city} onChange={(e) => setBusiness({ ...business, city: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Udyam number</label>
            <input className="input" value={business.udyamNumber} onChange={(e) => setBusiness({ ...business, udyamNumber: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Verification:</span>
            <span className={me?.business?.verificationStatus === "verified" ? "badge-verified" : "badge-pending"}>
              {me?.business?.verificationStatus || "not added"}
            </span>
          </div>
          <button onClick={saveBusiness} className="btn-primary" disabled={saving || !business.businessName}>
            {saving ? "Saving..." : "Save business details"}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">My stats &amp; reviews</h3>
        {publicData ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xl font-bold">{publicData.stats.jobsPosted}</p>
                <p className="text-xs text-gray-500">Jobs posted</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xl font-bold">{publicData.stats.jobsCompleted}</p>
                <p className="text-xs text-gray-500">Jobs done</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xl font-bold">{publicData.stats.reviewCount}</p>
                <p className="text-xs text-gray-500">Reviews</p>
              </div>
            </div>
            <div><Stars value={publicData.stats.avgRating} /></div>
            {publicData.reviews.length === 0 && <p className="text-sm text-gray-500">No reviews yet.</p>}
            {publicData.reviews.slice(0, 5).map((r: JobReview) => (
              <div key={r.id} className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.reviewerName}</span>
                  <Stars value={r.rating} />
                </div>
                {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
                {r.jobTitle && <p className="text-xs text-gray-400 mt-1">on “{r.jobTitle}”</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Loading...</p>
        )}
      </div>
    </div>
  );
}