import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Upload } from "lucide-react";
import { api, budgetLabel, type Job, type MyApplication, type ChatRoomSummary, type JobReview, type PublicUser } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Stars, StatusBadge, VerifiedBadge } from "../components/ui";
import CodeReviews from "../components/CodeReviews";

type Tab = "find" | "myjobs" | "mywork" | "messages" | "profile" | "repos";

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

  if (loading) return <div className="p-8 text-center text-muted">Loading...</div>;

  const tabs: { id: Tab; label: string }[] = [
    { id: "find", label: "Find Jobs" },
    { id: "myjobs", label: "My Jobs" },
    { id: "mywork", label: "My Work" },
    { id: "messages", label: `Messages${rooms.some((r) => r.unread > 0) ? ` (${rooms.reduce((s, r) => s + r.unread, 0)})` : ""}` },
    { id: "repos", label: "Code Reviews" },
    { id: "profile", label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      {/* Top bar: white, hairline bottom border, serif logo, verified business badge */}
      <header className="border-b border-line bg-surface sticky top-0 z-40">
        <div className="mx-auto max-w-[1120px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-serif text-[22px] font-semibold text-ink tracking-tight hover:opacity-95">
              SkillBridge
            </Link>
            {me?.business?.verificationStatus === "verified" && (
              <VerifiedBadge label="Verified business" />
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">{user?.name}</span>
            {me?.profile?.publicSlug && (
              <Link to={`/users/${user?.id}`} className="btn-ghost text-sm">
                Public profile
              </Link>
            )}
            <button onClick={signOut} className="btn-ghost text-sm">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-6 py-8 flex-1 w-full">
        {/* Main Navigation: plain text links, active item has 3px butter underline, inactive are muted, scrolls horizontally if needed */}
        <nav className="flex items-center gap-6 overflow-x-auto border-b border-line mb-8 pb-0 scrollbar-none whitespace-nowrap" aria-label="Main Navigation">
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

        {tab === "find" && <FindJobs jobs={openJobs} />}
        {tab === "myjobs" && <MyJobs jobs={myJobs} onChanged={loadAll} onError={setToast} />}
        {tab === "mywork" && <MyWork items={myWork} />}
        {tab === "messages" && <Messages rooms={rooms} onOpened={() => setTimeout(loadAll, 500)} />}
        {tab === "repos" && <CodeReviews />}
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="heading-title">Open jobs</h2>
        <input
          className="input max-w-xs"
          placeholder="Filter by skill..."
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {filtered.map((job) => {
          const applied = job.myApplication != null;
          const hiredCount = (job.positionFill ?? []).reduce((s, p) => s + (p.filled ?? 0), 0);
          const totalPositions = (job.positionFill ?? []).reduce((s, p) => s + p.count, 0);
          return (
            <div key={job.id} className="card p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <Link to={`/jobs/${job.id}`} className="heading-card hover:text-accent transition-colors block">
                    {job.title}
                  </Link>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    {job.description.slice(0, 160)}{job.description.length > 160 ? "…" : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="badge-budget">{budgetLabel(job)}</span>
                    <span className="badge-skill">{job.category}</span>
                    {job.owner?.businessName && (
                      <span className="badge-skill">{job.owner.businessName}</span>
                    )}
                    {job.owner?.verificationStatus === "verified" && (
                      <VerifiedBadge label="Verified" />
                    )}
                    {totalPositions > 1 && (
                      <span className="badge-lavender">
                        {hiredCount > 0 ? `Team hiring: ${hiredCount}/${totalPositions} filled` : `Team of ${totalPositions} needed`}
                      </span>
                    )}
                    {applied && (
                      <span
                        className={
                          job.myApplication!.status === "accepted"
                            ? "badge-verified"
                            : job.myApplication!.status === "rejected"
                              ? "badge-draft"
                              : "badge-open"
                        }
                      >
                        {job.myApplication!.status === "pending" ? "Applied — awaiting decision" : job.myApplication!.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 pt-1">
                  {!applied ? (
                    <Link to={`/jobs/${job.id}`} className="btn-primary shrink-0">
                      View &amp; quote
                    </Link>
                  ) : (
                    <Link to={`/jobs/${job.id}`} className="btn-secondary shrink-0">
                      View application
                    </Link>
                  )}
                </div>
              </div>

              {job.requiredSkills?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-line flex flex-wrap gap-1.5">
                  {job.requiredSkills.map((skill) => (
                    <span key={skill} className="badge-skill">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="empty-state">No open jobs found.</div>
        )}
      </div>
    </>
  );
}

function MyJobs({ jobs, onChanged, onError }: { jobs: Job[]; onChanged: () => Promise<void>; onError: (m: string) => void }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="heading-title">Jobs I posted</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          Post a job
        </button>
      </div>

      {showForm && (
        <PostJobForm
          onDone={() => {
            setShowForm(false);
            onChanged();
          }}
          onError={onError}
        />
      )}

      <div className="grid gap-4">
        {jobs.map((job) => (
          <div key={job.id} className="card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-0">
                <Link to={`/jobs/${job.id}`} className="heading-card hover:text-accent transition-colors block">
                  {job.title}
                </Link>
                <p className="text-sm text-muted mt-1 leading-relaxed">
                  {job.description.slice(0, 140)}{job.description.length > 140 ? "…" : ""}
                </p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="badge-budget">{budgetLabel(job)}</span>
                  <StatusBadge status={job.status} />
                  {job.applicationCount != null && job.applicationCount > 0 && (
                    <span className="badge-lavender">
                      {job.applicationCount} quote{job.applicationCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 pt-1">
                <Link to={`/jobs/${job.id}`} className="btn-tertiary shrink-0">
                  Manage
                </Link>
              </div>
            </div>
          </div>
        ))}

        {jobs.length === 0 && (
          <div className="empty-state">No jobs posted yet. Post your first job!</div>
        )}
      </div>
    </>
  );
}

function PostJobForm({ onDone, onError }: { onDone: () => void; onError: (m: string) => void }) {
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState<{ key: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
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

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded: { key: string; name: string }[] = [];
      for (const file of files) {
        uploaded.push(await api.uploadFile(file));
      }
      setUploads((prev) => [...prev, ...uploaded]);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

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

  async function create(publish: boolean) {
    setBusy(true);
    try {
      const positions = form.positions
        .split("\n")
        .map((line) => {
          const m = line.match(/^(.*?)\s*[x×*]\s*(\d+)\s*$/i);
          return m ? { title: m[1].trim(), count: Number(m[2]) } : { title: line.trim(), count: 1 };
        })
        .filter((p) => p.title);
      const job = await api.createJob({
        title: form.title,
        description: form.description,
        category: form.category,
        requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        positions: positions.length ? positions : undefined,
        budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
        deadline: form.deadline || undefined,
        acceptanceCriteria: form.acceptanceCriteria || undefined,
        attachments: uploads.length ? uploads : undefined,
        milestones: form.milestones
          .split("\n")
          .map((line) => {
            const m = line.match(/^(.*?)\s*\(due\s*(.*?)\)\s*$/i);
            return m ? { title: m[1].trim(), dueDate: m[2].trim() } : { title: line.trim() };
          })
          .filter((m) => m.title),
      });
      if (publish && job?.id) {
        await api.publishJob(job.id);
        onError("Job published — it's now open for quotes.");
      }
      onDone();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 mb-6">
      <h3 className="heading-card mb-4">Post a new job</h3>
      <div className="space-y-5">
        <section>
          <label className="label">Describe the job in plain language (AI will structure it)</label>
          <textarea
            className="input"
            rows={3}
            placeholder="e.g. We need a Diwali sale campaign for our store: Instagram posts, reel scripts and a caption calendar..."
            value={aiDescription}
            onChange={(e) => setAiDescription(e.target.value)}
          />
          <button
            type="button"
            onClick={generateBrief}
            className="btn-secondary mt-2.5"
            disabled={aiLoading || aiDescription.trim().length < 20}
          >
            {aiLoading ? "Generating..." : "Generate AI brief"}
          </button>
          {aiBrief && (
            <p className="mt-2 text-sm text-accent">
              AI brief generated — edit the fields below before publishing.
            </p>
          )}
        </section>

        <section className="border-t border-line pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <input
                className="input"
                placeholder="Marketing, Video Editing, Web Design, Software..."
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
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
            <textarea
              className="input"
              rows={3}
              placeholder={"Marketing x3\nGraphic Designer x1\nContent Creator x1"}
              value={form.positions}
              onChange={(e) => setForm({ ...form, positions: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <label className="label">Acceptance criteria</label>
            <textarea className="input" rows={2} value={form.acceptanceCriteria} onChange={(e) => setForm({ ...form, acceptanceCriteria: e.target.value })} />
          </div>
          <div className="mt-4">
            <label className="label">Milestones (one per line, optional: "Title (due YYYY-MM-DD)")</label>
            <textarea
              className="input"
              rows={3}
              placeholder={"Concept (due 2026-11-01)\nFinal delivery (due 2026-11-10)"}
              value={form.milestones}
              onChange={(e) => setForm({ ...form, milestones: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <label className="label">Reference files (optional)</label>
            <label className="btn-secondary cursor-pointer">
              {uploading ? "Uploading..." : "Upload files"}
              <input type="file" className="hidden" multiple onChange={handleFiles} />
            </label>
            {uploads.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {uploads.map((u) => (
                  <span key={u.key} className="badge-skill">
                    {u.name}
                    <button
                      type="button"
                      className="ml-1 text-muted hover:text-ink"
                      onClick={() => setUploads((prev) => prev.filter((x) => x.key !== u.key))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => create(false)} className="btn-secondary" disabled={busy || !form.title || !form.description || !form.category}>
            {busy ? "Saving..." : "Save as draft"}
          </button>
          <button type="button" onClick={() => create(true)} className="btn-primary" disabled={busy || !form.title || !form.description || !form.category}>
            {busy ? "Publishing..." : "Save & publish"}
          </button>
          <button type="button" onClick={onDone} className="btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function MyWork({ items }: { items: MyApplication[] }) {
  return (
    <>
      <h2 className="heading-title mb-6">My applications &amp; work</h2>
      <div className="grid gap-4">
        {items.map((app) => {
          const hired = app.status === "accepted" && app.onTeam;
          return (
            <div key={app.id} className="card p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <Link to={`/jobs/${app.jobId}`} className="heading-card hover:text-accent transition-colors block">
                    {app.job?.title || "Job"}
                  </Link>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className={hired ? "badge-verified" : app.status === "rejected" ? "badge-draft" : "badge-open"}>
                      {hired ? "hired" : app.status}
                    </span>
                    {app.positionTitle && <span className="badge-lavender">{app.positionTitle}</span>}
                    {app.job && <StatusBadge status={app.job.status} />}
                    {app.job && <span className="badge-budget">{budgetLabel(app.job)}</span>}
                    {app.quoteAmount != null && (
                      <span className="badge-skill">
                        Your quote: ₹{app.quoteAmount.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  {hired && app.milestones.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-line flex flex-wrap gap-1.5">
                      {app.milestones.map((m) => (
                        <span key={m.id} className="badge-draft">
                          {m.status === "approved" ? "✓" : m.status === "submitted" ? "•" : "○"} {m.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 pt-1">
                  {hired && (
                    <Link to={`/chat/${app.jobId}`} className="btn-secondary">
                      Chat
                    </Link>
                  )}
                  <Link to={`/jobs/${app.jobId}`} className="btn-primary">
                    Open
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="empty-state">You haven't applied to any jobs yet.</div>
        )}
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
      <h2 className="heading-title mb-6">Messages</h2>
      <div className="grid gap-3">
        {merged.map(({ room, unread, hasMentor }) => (
          <Link
            key={room.jobId}
            to={`/chat/${room.jobId}`}
            onClick={onOpened}
            className="card-clickable flex items-center justify-between p-6"
          >
            <div>
              <p className="font-serif text-[18px] font-semibold text-ink">{room.title}</p>
              <div className="text-sm text-muted mt-1 flex items-center gap-2 flex-wrap">
                {hasMentor && <span className="badge-lavender">mentor room</span>}
                <span>
                  team: {room.teamNames.join(", ") || "—"}
                  {room.mentorName ? ` · mentor: ${room.mentorName}` : ""}
                </span>
                <span>·</span>
                <StatusBadge status={room.status} />
              </div>
            </div>
            {unread > 0 && (
              <span className="rounded-full bg-butter text-ink text-xs font-semibold px-2.5 py-1">
                {unread} new
              </span>
            )}
          </Link>
        ))}
        {merged.length === 0 && (
          <div className="empty-state">No conversations yet. Chat opens once a job is awarded.</div>
        )}
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
      {/* Column 1: Talent profile */}
      <div className="card p-6">
        <h3 className="heading-card mb-4">Talent profile</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
          <div className="space-y-3">
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
              <label className="btn-secondary cursor-pointer gap-1.5">
                <Upload strokeWidth={1.5} className="w-4 h-4 text-ink" />
                <span>{uploading ? "Uploading..." : "Upload resume"}</span>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={uploadResume} />
              </label>
              {me?.profile?.resumeKey && <span className="text-sm text-muted">{me.profile.resumeName}</span>}
            </div>
          </div>

          <button type="button" onClick={saveProfile} className="btn-primary w-full" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </div>

      {/* Column 2: Business details */}
      <div className="card p-6">
        <h3 className="heading-card mb-1">Business details</h3>
        <p className="text-sm text-muted mb-4">Add these when you want to post jobs as a business.</p>
        <div className="space-y-4">
          <div>
            <label className="label">Business name</label>
            <input className="input" value={business.businessName} onChange={(e) => setBusiness({ ...business, businessName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-muted">Verification:</span>
            {me?.business?.verificationStatus === "verified" ? (
              <VerifiedBadge label="verified" />
            ) : (
              <span className="badge-draft">
                {me?.business?.verificationStatus || "not added"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={saveBusiness}
            className="btn-primary w-full"
            disabled={saving || !business.businessName}
          >
            {saving ? "Saving..." : "Save business details"}
          </button>
        </div>
      </div>

      {/* Column 3: My stats & reviews */}
      <div className="card p-6">
        <h3 className="heading-card mb-4">My stats &amp; reviews</h3>
        {publicData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="stat-tile">
                <p className="stat-num">{publicData.stats.jobsPosted}</p>
                <p className="stat-label">Jobs posted</p>
              </div>
              <div className="stat-tile">
                <p className="stat-num">{publicData.stats.jobsCompleted}</p>
                <p className="stat-label">Jobs done</p>
              </div>
              <div className="stat-tile">
                <p className="stat-num">{publicData.stats.reviewCount}</p>
                <p className="stat-label">Reviews</p>
              </div>
            </div>

            <div className="py-1">
              <Stars value={publicData.stats.avgRating} />
            </div>

            {publicData.reviews.length === 0 && (
              <div className="empty-state">No reviews yet.</div>
            )}

            <div className="space-y-3">
              {publicData.reviews.slice(0, 5).map((r: JobReview) => (
                <div key={r.id} className="rounded-[8px] border border-line bg-surface p-3.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{r.reviewerName}</span>
                    <Stars value={r.rating} />
                  </div>
                  {r.comment && <p className="text-sm text-muted mt-1 leading-relaxed">{r.comment}</p>}
                  {r.jobTitle && <p className="text-xs text-muted/70 mt-1">on “{r.jobTitle}”</p>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Loading...</p>
        )}
      </div>
    </div>
  );
}