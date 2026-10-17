"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, type Project, type Application } from "@/lib/api";

export default function SmeDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPostForm, setShowPostForm] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiBrief, setAiBrief] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "", requiredSkills: "", budgetType: "unpaid" as const, deadline: "", acceptanceCriteria: "" });
  const [applicants, setApplicants] = useState<{ project: Project; items: Application[] } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
    api.setToken(token);
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await api.getProjects({ mine: true });
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function generateBrief() {
    setAiLoading(true);
    try {
      const brief = await api.generateBrief(aiDescription);
      setAiBrief(brief);
      setForm((f) => ({ ...f, title: brief.title, description: brief.summary, requiredSkills: brief.requiredSkills.join(", "), acceptanceCriteria: brief.acceptanceCriteria }));
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  }

  async function createProject() {
    try {
      await api.createProject({
        title: form.title,
        description: form.description,
        category: form.category,
        requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        budgetType: form.budgetType,
        deadline: form.deadline || undefined,
        acceptanceCriteria: form.acceptanceCriteria,
        rubric: aiBrief?.suggestedRubric || [],
      });
      setShowPostForm(false);
      loadProjects();
    } catch (err) {
      console.error(err);
    }
  }

  async function publishProject(id: string) {
    try {
      await api.publishProject(id);
      loadProjects();
    } catch (err) {
      console.error(err);
    }
  }

  async function openApplicants(project: Project) {
    try {
      const items = await api.getApplications(project.id);
      setApplicants({ project, items });
    } catch (err) {
      console.error(err);
    }
  }

  async function accept(applicationId: string) {
    try {
      await api.acceptApplication(applicationId);
      setApplicants(null);
      loadProjects();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">SkillBridge — SME Dashboard</h1>
          <button onClick={() => { localStorage.removeItem("token"); router.push("/"); }} className="btn-ghost">Sign out</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">My Projects</h2>
          <button onClick={() => setShowPostForm(true)} className="btn-primary">Post a project</button>
        </div>

        {showPostForm && (
          <div className="card mb-6">
            <h3 className="font-semibold text-lg mb-4">Post a new project</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Describe your problem (AI will structure it)</label>
                <textarea className="input" rows={3} placeholder="e.g. We keep running out of stock in our warehouse and need a simple dashboard to track inventory levels..."
                  value={aiDescription} onChange={(e) => setAiDescription(e.target.value)} />
                <button onClick={generateBrief} className="btn-secondary mt-2" disabled={aiLoading}>
                  {aiLoading ? "Generating..." : "Generate AI brief"}
                </button>
              </div>

              {aiBrief && (
                <div className="rounded-lg bg-brand-50 p-4">
                  <p className="text-sm font-medium text-brand-800 mb-2">AI-generated brief (edit before publishing)</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Title:</strong> {aiBrief.title}</div>
                    <div><strong>Effort:</strong> {aiBrief.estimatedEffort}</div>
                    <div className="col-span-2"><strong>Summary:</strong> {aiBrief.summary}</div>
                    <div className="col-span-2"><strong>Skills:</strong> {aiBrief.requiredSkills?.join(", ")}</div>
                    <div className="col-span-2"><strong>Deliverables:</strong> {aiBrief.deliverables?.join(", ")}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Title</label>
                  <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label className="label">Category</label>
                  <input className="input" placeholder="e.g. Dashboard, Automation, CAD" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Required skills (comma-separated)</label>
                  <input className="input" value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
                </div>
                <div>
                  <label className="label">Budget type</label>
                  <select className="input" value={form.budgetType} onChange={(e) => setForm({ ...form, budgetType: e.target.value as any })}>
                    <option value="unpaid">Unpaid (educational)</option>
                    <option value="stipend">Stipend</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Acceptance criteria</label>
                <textarea className="input" rows={2} value={form.acceptanceCriteria} onChange={(e) => setForm({ ...form, acceptanceCriteria: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button onClick={createProject} className="btn-primary">Save as draft</button>
                <button onClick={() => setShowPostForm(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {projects.map((project) => (
            <div key={project.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{project.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`badge ${project.budgetType === "paid" ? "badge-paid" : "badge-unpaid"}`}>{project.budgetType}</span>
                    <span className={`badge ${project.status === "open" ? "badge-verified" : "badge-pending"}`}>{project.status}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {project.status !== "draft" && (
                    <button onClick={() => openApplicants(project)} className="btn-secondary">Applicants</button>
                  )}
                  {project.status === "draft" && (
                    <button onClick={() => publishProject(project.id)} className="btn-primary">Publish</button>
                  )}
                </div>
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
          {projects.length === 0 && (
            <div className="card text-center text-gray-500">No projects yet. Post your first project!</div>
          )}
        </div>
      </main>

      {applicants && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="font-semibold text-lg mb-4">Applicants — {applicants.project.title}</h3>
            <div className="space-y-3">
              {applicants.items.map((a) => (
                <div key={a.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{a.student?.name}</p>
                    <span className={`badge ${a.status === "accepted" ? "badge-verified" : a.status === "rejected" ? "badge-unpaid" : "badge-pending"}`}>{a.status}</span>
                  </div>
                  {a.student?.college && <p className="text-sm text-gray-500">{a.student.college}</p>}
                  <p className="text-sm text-gray-600 mt-1">{a.pitch}</p>
                  {a.status === "pending" && (
                    <button onClick={() => accept(a.id)} className="btn-primary mt-2">Accept</button>
                  )}
                </div>
              ))}
              {applicants.items.length === 0 && <p className="text-gray-500">No applicants yet.</p>}
            </div>
            <button onClick={() => setApplicants(null)} className="btn-ghost mt-4">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
