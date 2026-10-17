import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Github, Linkedin, Globe, Upload } from "lucide-react";
import { api, type Application, type MyApplication, type Project } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Tab = "find" | "mywork" | "projects" | "profile";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, me, refresh, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("find");

  const [openProjects, setOpenProjects] = useState<Project[]>([]);
  const [myWork, setMyWork] = useState<MyApplication[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  async function loadAll() {
    try {
      const [open, mine, posted] = await Promise.all([
        api.getProjects({ status: "open" }),
        api.getMyApplications(),
        api.getProjects({ mine: true }),
      ]);
      setOpenProjects(open);
      setMyWork(mine);
      setMyProjects(posted);
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
    { id: "find", label: "Find Work" },
    { id: "mywork", label: "My Work" },
    { id: "projects", label: "My Projects" },
    { id: "profile", label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-brand-600">SkillBridge</h1>
            {me?.business?.verificationStatus === "verified" && (
              <span className="badge-verified">Verified business</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.name}</span>
            {me?.profile?.publicSlug && (
              <Link to={`/passport/${me.profile.publicSlug}`} className="btn-ghost text-sm">My Passport</Link>
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
            </button>
          ))}
        </div>

        {toast && <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">{toast}</div>}

        {tab === "find" && <FindWork projects={openProjects} onApplied={() => { setToast("Application submitted."); loadAll(); }} onError={setToast} />}
        {tab === "mywork" && <MyWork items={myWork} onSubmitted={() => { setToast("Work submitted for review."); loadAll(); }} onError={setToast} />}
        {tab === "projects" && <MyProjects projects={myProjects} onChanged={() => { loadAll(); refresh(); }} onError={setToast} />}
        {tab === "profile" && <ProfileTab onChanged={refresh} onError={setToast} />}
      </main>
    </div>
  );
}

function FindWork({ projects, onApplied, onError }: { projects: Project[]; onApplied: () => void; onError: (m: string) => void }) {
  const [skillFilter, setSkillFilter] = useState("");
  const [applyingTo, setApplyingTo] = useState<Project | null>(null);
  const [pitch, setPitch] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = skillFilter
    ? projects.filter((p) => p.requiredSkills?.some((s) => s.toLowerCase().includes(skillFilter.toLowerCase())))
    : projects;

  async function apply() {
    if (!applyingTo) return;
    setBusy(true);
    try {
      await api.applyToProject(applyingTo.id, pitch);
      setApplyingTo(null);
      setPitch("");
      onApplied();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Open Projects</h2>
        <input className="input max-w-xs" placeholder="Filter by skill..." value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} />
      </div>
      <div className="grid gap-4">
        {filtered.map((project) => (
          <div key={project.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link to={`/projects/${project.id}`} className="font-semibold text-lg hover:underline">{project.title}</Link>
                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className={`badge ${project.budgetType === "paid" ? "badge-paid" : "badge-unpaid"}`}>{project.budgetType}</span>
                  {project.owner?.businessName && <span className="badge bg-gray-100 text-gray-700">{project.owner.businessName}</span>}
                  {project.owner?.verificationStatus === "verified" && <span className="badge-verified">Verified</span>}
                </div>
              </div>
              <button onClick={() => setApplyingTo(project)} className="btn-primary shrink-0">Apply</button>
            </div>
            {project.requiredSkills?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {project.requiredSkills.map((skill) => (
                  <span key={skill} className="badge bg-gray-100 text-gray-700">{skill}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="card text-center text-gray-500">No open projects found.</div>}
      </div>

      {applyingTo && (
        <Modal title="Apply to project" onClose={() => setApplyingTo(null)}>
          <p className="text-sm text-gray-600 mb-3">{applyingTo.title}</p>
          <textarea className="input" rows={4} placeholder="Write a short pitch: why are you a good fit?"
            value={pitch} onChange={(e) => setPitch(e.target.value)} />
          <div className="flex gap-2 mt-4">
            <button onClick={apply} className="btn-primary" disabled={busy || pitch.trim().length < 20}>
              {busy ? "Submitting..." : "Submit application"}
            </button>
            <button onClick={() => setApplyingTo(null)} className="btn-ghost">Cancel</button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Pitch must be at least 20 characters.</p>
        </Modal>
      )}
    </>
  );
}

function MyWork({ items, onSubmitted, onError }: { items: MyApplication[]; onSubmitted: () => void; onError: (m: string) => void }) {
  const [submitting, setSubmitting] = useState<{ milestoneId: string; title: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!submitting) return;
    setBusy(true);
    try {
      await api.submitWork({ milestoneId: submitting.milestoneId, notes, fileUrls: [] });
      setSubmitting(null);
      setNotes("");
      onSubmitted();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-4">My Work</h2>
      <div className="grid gap-4">
        {items.map((app) => (
          <div key={app.id} className="card">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg">{app.project?.title}</h3>
              <span className={`badge ${app.status === "accepted" ? "badge-verified" : app.status === "rejected" ? "badge-unpaid" : "badge-pending"}`}>{app.status}</span>
            </div>
            {app.status === "accepted" && app.milestones?.length > 0 && (
              <div className="mt-4 space-y-2">
                {app.milestones.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`w-2 h-2 rounded-full ${m.status === "approved" ? "bg-green-500" : m.status === "submitted" ? "bg-yellow-500" : "bg-gray-300"}`} />
                      <span>{m.title}</span>
                      <span className="badge bg-gray-100 text-gray-600">{m.status}</span>
                    </div>
                    {m.status === "pending" && (
                      <button onClick={() => setSubmitting({ milestoneId: m.id, title: m.title })} className="btn-secondary">Submit work</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <div className="card text-center text-gray-500">You have not applied to any projects yet.</div>}
      </div>

      {submitting && (
        <Modal title="Submit work" onClose={() => setSubmitting(null)}>
          <p className="text-sm text-gray-600 mb-3">{submitting.title}</p>
          <label className="label">Notes / links to your work</label>
          <textarea className="input" rows={4} placeholder="Describe what you delivered and paste any links..."
            value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex gap-2 mt-4">
            <button onClick={submit} className="btn-primary" disabled={busy}>{busy ? "Submitting..." : "Submit for review"}</button>
            <button onClick={() => setSubmitting(null)} className="btn-ghost">Cancel</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function MyProjects({ projects, onChanged, onError }: { projects: Project[]; onChanged: () => void; onError: (m: string) => void }) {
  const { me } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [applicants, setApplicants] = useState<{ project: Project; items: Application[] } | null>(null);

  async function publish(id: string) {
    try {
      await api.publishProject(id);
      onChanged();
    } catch (err) {
      onError((err as Error).message);
    }
  }

  async function openApplicants(project: Project) {
    try {
      const items = await api.getApplications(project.id);
      setApplicants({ project, items });
    } catch (err) {
      onError((err as Error).message);
    }
  }

  async function accept(applicationId: string) {
    try {
      await api.acceptApplication(applicationId);
      setApplicants(null);
      onChanged();
    } catch (err) {
      onError((err as Error).message);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">My Projects</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">Post a project</button>
      </div>

      {showForm && <PostProjectForm defaultBusiness={me?.business ?? null} onDone={() => { setShowForm(false); onChanged(); }} onError={onError} />}

      <div className="grid gap-4">
        {projects.map((project) => (
          <div key={project.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">{project.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`badge ${project.budgetType === "paid" ? "badge-paid" : "badge-unpaid"}`}>{project.budgetType}</span>
                  <span className={`badge ${project.status === "open" ? "badge-verified" : "badge-pending"}`}>{project.status}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {project.status !== "draft" && <button onClick={() => openApplicants(project)} className="btn-secondary">Applicants</button>}
                {project.status === "draft" && <button onClick={() => publish(project.id)} className="btn-primary">Publish</button>}
              </div>
            </div>
          </div>
        ))}
        {projects.length === 0 && <div className="card text-center text-gray-500">No projects yet. Post your first project!</div>}
      </div>

      {applicants && (
        <Modal title={`Applicants — ${applicants.project.title}`} onClose={() => setApplicants(null)}>
          <div className="space-y-3">
            {applicants.items.map((a) => {
              const applicant = a.applicant;
              return (
                <div key={a.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{applicant?.name}</p>
                    <span className={`badge ${a.status === "accepted" ? "badge-verified" : a.status === "rejected" ? "badge-unpaid" : "badge-pending"}`}>{a.status}</span>
                  </div>
                  {applicant?.college && <p className="text-sm text-gray-500">{applicant.college}</p>}
                  {applicant && applicant.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {applicant.skills.map((s) => <span key={s} className="badge bg-gray-100 text-gray-700">{s}</span>)}
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-1">{a.pitch}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {applicant?.linkedin && <a href={applicant.linkedin} target="_blank" rel="noreferrer" className="text-brand-600"><Linkedin className="w-4 h-4" /></a>}
                    {applicant?.github && <a href={applicant.github} target="_blank" rel="noreferrer" className="text-gray-700"><Github className="w-4 h-4" /></a>}
                    {applicant?.portfolio && <a href={applicant.portfolio} target="_blank" rel="noreferrer" className="text-gray-700"><Globe className="w-4 h-4" /></a>}
                    {applicant?.resumeKey && (
                      <button onClick={() => api.downloadResume(applicant.id)} className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1">
                        <FileText className="w-4 h-4" /> Resume
                      </button>
                    )}
                    {a.status === "pending" && <button onClick={() => accept(a.id)} className="btn-primary ml-auto">Accept</button>}
                  </div>
                </div>
              );
            })}
            {applicants.items.length === 0 && <p className="text-gray-500">No applicants yet.</p>}
          </div>
        </Modal>
      )}
    </>
  );
}

function PostProjectForm({ defaultBusiness, onDone, onError }: { defaultBusiness: { businessName: string; sector: string | null; city: string | null } | null; onDone: () => void; onError: (m: string) => void }) {
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [rubric, setRubric] = useState<Project["rubric"]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    requiredSkills: "",
    budgetType: "unpaid" as Project["budgetType"],
    deadline: "",
    acceptanceCriteria: "",
    businessName: defaultBusiness?.businessName || "",
    sector: defaultBusiness?.sector || "",
    city: defaultBusiness?.city || "",
  });

  async function generateBrief() {
    setAiLoading(true);
    try {
      const brief = await api.generateBrief(aiDescription);
      setRubric(brief.suggestedRubric);
      setForm((f) => ({
        ...f,
        title: brief.title,
        description: brief.summary,
        requiredSkills: brief.requiredSkills.join(", "),
        acceptanceCriteria: brief.acceptanceCriteria,
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
      if (form.businessName) {
        await api.updateBusiness({ businessName: form.businessName, sector: form.sector, city: form.city });
      }
      await api.createProject({
        title: form.title,
        description: form.description,
        category: form.category,
        requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        budgetType: form.budgetType,
        deadline: form.deadline || undefined,
        acceptanceCriteria: form.acceptanceCriteria,
        rubric: rubric || [],
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
      <h3 className="font-semibold text-lg mb-4">Post a new project</h3>
      <div className="space-y-5">
        <section>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Business details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Business name</label>
              <input className="input" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            </div>
            <div>
              <label className="label">Sector</label>
              <input className="input" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
        </section>

        <section>
          <label className="label">Describe your problem in plain language</label>
          <textarea className="input" rows={3} placeholder="e.g. We keep running out of stock and need a simple dashboard to track inventory levels..."
            value={aiDescription} onChange={(e) => setAiDescription(e.target.value)} />
          <button onClick={generateBrief} className="btn-secondary mt-2" disabled={aiLoading || aiDescription.trim().length < 20}>
            {aiLoading ? "Generating..." : "Generate AI brief"}
          </button>
        </section>

        <section className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" placeholder="Dashboard, Automation, CAD" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="md:col-span-2">
              <label className="label">Required skills (comma-separated)</label>
              <input className="input" value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
            </div>
            <div>
              <label className="label">Budget type</label>
              <select className="input" value={form.budgetType} onChange={(e) => setForm({ ...form, budgetType: e.target.value as Project["budgetType"] })}>
                <option value="unpaid">Unpaid (educational)</option>
                <option value="stipend">Stipend</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Acceptance criteria</label>
            <textarea className="input" rows={2} value={form.acceptanceCriteria} onChange={(e) => setForm({ ...form, acceptanceCriteria: e.target.value })} />
          </div>
          {rubric && rubric.length > 0 && (
            <div className="mt-4 rounded-lg bg-brand-50 p-3 text-sm">
              <p className="font-medium text-brand-800 mb-1">Rubric ({rubric.length} criteria)</p>
              <ul className="list-disc list-inside text-brand-800">
                {rubric.map((r) => <li key={r.criterion}>{r.criterion}</li>)}
              </ul>
            </div>
          )}
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

function ProfileTab({ onChanged, onError }: { onChanged: () => Promise<void> | void; onError: (m: string) => void }) {
  const { me } = useAuth();
  const [form, setForm] = useState({
    phone: "",
    city: "",
    college: "",
    bio: "",
    skills: "",
    linkedin: "",
    github: "",
    portfolio: "",
    passportConsent: false,
  });
  const [business, setBusiness] = useState({ businessName: "", sector: "", city: "", udyamNumber: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        passportConsent: Boolean(me.profile.passportConsent),
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
  }, [me]);

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
        passportConsent: form.passportConsent,
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
    <div className="grid lg:grid-cols-2 gap-6">
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
          <div className="grid grid-cols-1 gap-4">
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

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.passportConsent} onChange={(e) => setForm({ ...form, passportConsent: e.target.checked })} />
            Make my Skill Passport public
          </label>
          {form.passportConsent && me?.profile?.publicSlug && (
            <p className="text-sm text-gray-500">Public link: <Link className="text-brand-600 hover:underline" to={`/passport/${me.profile.publicSlug}`}>/passport/{me.profile.publicSlug}</Link></p>
          )}

          <button onClick={saveProfile} className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Business details</h3>
        <p className="text-sm text-gray-500 mb-4">Add these when you want to post projects as a business.</p>
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
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="btn-ghost">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
