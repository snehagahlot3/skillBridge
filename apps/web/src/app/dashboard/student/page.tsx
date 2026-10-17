"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, type Project, type Milestone } from "@/lib/api";

interface MyApplication {
  id: string;
  projectId: string;
  pitch: string;
  status: "pending" | "accepted" | "rejected";
  project: { id: string; title: string; status: string } | null;
  milestones: Milestone[];
}

export default function StudentDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<"marketplace" | "work">("marketplace");
  const [projects, setProjects] = useState<Project[]>([]);
  const [myWork, setMyWork] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [skillFilter, setSkillFilter] = useState("");
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [pitch, setPitch] = useState("");
  const [submitting, setSubmitting] = useState<{ milestoneId: string; title: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
    api.setToken(token);
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [open, mine] = await Promise.all([api.getProjects({ status: "open" }), api.getMyApplications()]);
      setProjects(open);
      setMyWork(mine);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function apply(projectId: string) {
    try {
      await api.applyToProject(projectId, pitch);
      setApplyingTo(null);
      setPitch("");
      loadAll();
    } catch (err: any) {
      setToast(err.message);
    }
  }

  async function submitWork() {
    if (!submitting) return;
    try {
      await api.submitWork({ milestoneId: submitting.milestoneId, notes, fileUrls: [] });
      setSubmitting(null);
      setNotes("");
      loadAll();
    } catch (err: any) {
      setToast(err.message);
    }
  }

  const filtered = skillFilter
    ? projects.filter((p) => p.requiredSkills?.some((s) => s.toLowerCase().includes(skillFilter.toLowerCase())))
    : projects;

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">SkillBridge — Student Dashboard</h1>
          <button onClick={() => { localStorage.removeItem("token"); router.push("/"); }} className="btn-ghost">Sign out</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("marketplace")} className={tab === "marketplace" ? "btn-primary" : "btn-secondary"}>Marketplace</button>
          <button onClick={() => setTab("work")} className={tab === "work" ? "btn-primary" : "btn-secondary"}>My Work</button>
        </div>

        {toast && <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">{toast}</div>}

        {tab === "marketplace" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Open Projects</h2>
              <input className="input max-w-xs" placeholder="Filter by skill..." value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} />
            </div>
            <div className="grid gap-4">
              {filtered.map((project) => (
                <div key={project.id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{project.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`badge ${project.budgetType === "paid" ? "badge-paid" : "badge-unpaid"}`}>{project.budgetType}</span>
                        {project.sme?.verificationStatus === "verified" && <span className="badge-verified">Verified SME</span>}
                      </div>
                    </div>
                    <button onClick={() => setApplyingTo(project.id)} className="btn-primary">Apply</button>
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
              {filtered.length === 0 && <div className="card text-center text-gray-500">No projects found.</div>}
            </div>
          </>
        )}

        {tab === "work" && (
          <>
            <h2 className="text-2xl font-bold mb-4">My Work</h2>
            <div className="grid gap-4">
              {myWork.map((app) => (
                <div key={app.id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{app.project?.title}</h3>
                      <span className={`badge ${app.status === "accepted" ? "badge-verified" : "badge-pending"}`}>{app.status}</span>
                    </div>
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
                            <button onClick={() => setSubmitting({ milestoneId: m.id, title: m.title })} className="btn-secondary">
                              Submit work
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {myWork.length === 0 && <div className="card text-center text-gray-500">You haven't applied to any projects yet.</div>}
            </div>
          </>
        )}
      </main>

      {applyingTo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <h3 className="font-semibold text-lg mb-4">Apply to project</h3>
            <textarea className="input" rows={4} placeholder="Write a short pitch: why are you a good fit?"
              value={pitch} onChange={(e) => setPitch(e.target.value)} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => apply(applyingTo)} className="btn-primary">Submit application</button>
              <button onClick={() => setApplyingTo(null)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {submitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <h3 className="font-semibold text-lg mb-1">Submit work</h3>
            <p className="text-sm text-gray-600 mb-4">{submitting.title}</p>
            <label className="label">Notes / links to your work</label>
            <textarea className="input" rows={4} placeholder="Describe what you delivered and paste any links..."
              value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="flex gap-2 mt-4">
              <button onClick={submitWork} className="btn-primary">Submit for review</button>
              <button onClick={() => setSubmitting(null)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
